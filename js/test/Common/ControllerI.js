// **********************************************************************
//
// Copyright (c) 2003-2017 ZeroC, Inc. All rights reserved.
//
// This copy of Ice is licensed to you under the terms described in the
// ICE_LICENSE file included in this distribution.
//
// **********************************************************************

var process = { argv : [] };

function isSafari()
{
    return /^((?!chrome).)*safari/i.test(navigator.userAgent);
}

function isChrome()
{
    //
    // We need to check for Edge browser as it might include Chrome in its user agent.
    //
    return navigator.userAgent.indexOf("Edge/") === -1 &&
           navigator.userAgent.indexOf("Chrome/") !== -1;
}

function isWorker()
{
    return typeof(WorkerGlobalScope) !== 'undefined' && this instanceof WorkerGlobalScope;
}

function isWindows()
{
    return navigator.userAgent.indexOf("Windows") != -1;
}

class Logger extends Ice.Logger
{
    constructor(out)
    {
        super()
        this._out = out
    }

    write(message, indent)
    {
        if(indent)
        {
            message = message.replace(/\n/g, "\n   ");
        }
        this._out.writeLine(message);
    }
}

class ProcessI extends Test.Common.Process
{
    constructor(promise, output, ready)
    {
        super();
        this._promise = promise;
        this._output = output;
        this._ready = ready;
    }

    waitReady(timeout, current)
    {
        if(this._ready)
        {
            return this._ready;
        }
    }

    waitSuccess(timeout, current)
    {
        let out = this._output;
        return this._promise.then(function() {
            return 0;
        }, function(ex) {
            out.writeLine("unexpected exception while running test: " + ex.toString() + "\nstack = " + ex.stack);
            return 1;
        });
    }

    terminate(current)
    {
        current.adapter.remove(current.id);
        return this._output.get();
    }
};

class ProcessControllerI extends Test.Common.ProcessController
{
    constructor(clientOutput, serverOutput, useWorker, scripts)
    {
        super();
        this._clientOutput = clientOutput;
        this._serverOutput = serverOutput;
        this._useWorker = useWorker;
        this._scripts = scripts;
    }

    start(testSuite, exe, args, current)
    {
        let promise;
        let ready = null;
        if(exe === "Server" || exe === "ServerAMD")
        {
            ready = new Ice.Promise();
        }
        if(this._useWorker)
        {
            let scripts = this._scripts;
            promise = new Promise((resolve, reject) => {
                let worker;
                if(document.location.pathname.indexOf("/es5/") !== -1)
                {
                    worker = new Worker("/test/es5/Common/ControllerWorker.js");
                }
                else
                {
                    worker = new Worker("/test/Common/ControllerWorker.js");
                }
                this._worker = worker;
                worker.onmessage = function(e) {
                    if(e.data.type == "write")
                    {
                        this._clientOutput.write(e.data.message);
                    }
                    else if(e.data.type == "writeLine")
                    {
                        this._clientOutput.writeLine(e.data.message);
                    }
                    if(e.data.type == "serverWrite")
                    {
                        this._serverOutput.write(e.data.message);
                    }
                    else if(e.data.type == "serverWriteLine")
                    {
                        this._serverOutput.writeLine(e.data.message);
                    }
                    else if(e.data.type == "ready" && (exe === "Server" || exe === "ServerAMD"))
                    {
                        ready.resolve();
                    }
                    else if(e.data.type == "finished")
                    {
                        if(e.data.exception)
                        {
                            reject(e.data.exception);
                        }
                        else
                        {
                            resolve();
                        }
                        worker.terminate();
                    }
                };
                worker.postMessage({ scripts:scripts, exe:exe, args:args })
            });
        }
        else
        {
            let initData = new Ice.InitializationData();
            initData.properties = Ice.createProperties(args);
            process.argv = args
            if(exe === "Server" || exe === "ServerAMD")
            {
                initData.logger = new Logger(this._serverOutput);
                let test = exe === "Server" ? _server : _serveramd;
                promise = test(this._serverOutput, initData, ready);
            }
            else
            {
                initData.logger = new Logger(this._clientOutput);
                promise = _test(this._clientOutput, initData);
            }
        }
        let out = exe === "Server" || exe === "ServerAMD" ? this._serverOutput : this._clientOutput;
        return Test.Common.ProcessPrx.uncheckedCast(current.adapter.addWithUUID(new ProcessI(promise, out, ready)));
    }

    getHost(protocol, ipv6, current)
    {
        return "127.0.0.1"
    }
};

function runController(clientOutput, serverOutput, scripts)
{
    function wrapOutput(output)
    {
        return {
            write: function(msg)
            {
                let text = output.val();
                output.val((text === "") ? msg : (text + msg));
            },
            writeLine: function(msg)
            {
                msg = msg + "\n";
                let text = output.val();
                output.val((text === "") ? msg : (text + msg));
                output.scrollTop(output.get(0).scrollHeight);
            },
            get: function()
            {
                return output.val()
            }
        };
    }
    let out = wrapOutput(clientOutput);
    let serverOut = wrapOutput(serverOutput);

    window.onerror = function(msg, url, line, column, err)
    {
        let e = msg + " at " + url + ":" + line + ":" + column;
        if(err)
        {
            e += "\n" + err.stack;
        }
        out.writeLine(e);
        return false;
    };

    let uri = new URI(document.location.href)
    let initData = new Ice.InitializationData();
    let protocol = uri.protocol() === "http" ? "ws" : "wss";
    query = uri.search(true)
    let port = "port" in query ? query["port"] : 15002;
    let worker = "worker" in query ? query["worker"] === "True" : false;
    initData.logger = new Logger(out);

    let registerProcessController = function(adapter, registry, processController) {
        registry.setProcessController(Test.Common.ProcessControllerPrx.uncheckedCast(processController)).then(
        () => {
            let connection = registry.ice_getCachedConnection();
            connection.setAdapter(adapter)
            connection.setACM(5, Ice.ACMClose.CloseOff, Ice.ACMHeartbeat.HeartbeatAlways);
            connection.setCloseCallback(connection => {
                out.writeLine("connection with process controller registry closed");
            });
        },
        ex => {
            if(ex instanceof Ice.ConnectFailedException)
            {
                setTimeout(() => registerProcessController(adapter, registry, processController), 2000);
            }
            else
            {
                out.writeLine("unexpected exception while connecting to process controller registry:\n" + ex.toString())
            }
        });
    };

    let comm = Ice.initialize();
    let str = "Util/ProcessControllerRegistry:" + protocol + " -h 127.0.0.1 -p " + port;
    let registry = Test.Common.ProcessControllerRegistryPrx.uncheckedCast(comm.stringToProxy(str));
    comm.createObjectAdapter("").then(adapter => {
        let ident = new Ice.Identity("ProcessController", "Browser");
        let processController = adapter.add(new ProcessControllerI(out, serverOut, worker, scripts), ident);
        adapter.activate();
        registerProcessController(adapter, registry, processController);
    }).catch(ex => {
        out.writeLine("unexpected exception while creating controller:\n" + ex.toString());
        comm.destroy();
    });
}