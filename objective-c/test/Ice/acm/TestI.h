// **********************************************************************
//
// Copyright (c) 2003-2016 ZeroC, Inc. All rights reserved.
//
// This copy of Ice is licensed to you under the terms described in the
// ICE_LICENSE file included in this distribution.
//
// **********************************************************************

#import <objc/Ice.h>
#import <ACMTest.h>

#import <Foundation/Foundation.h>

@interface RemoteCommunicatorI : TestACMRemoteCommunicator<TestACMRemoteCommunicator>
@end

@interface RemoteObjectAdapterI : TestACMRemoteObjectAdapter<TestACMRemoteObjectAdapter>
{
    id<ICEObjectAdapter> _adapter;
    id<TestACMTestIntfPrx> _testIntf;
}
-(id) initWithAdapter:(id<ICEObjectAdapter>)adapter;
@end

@interface ConnectionCallbackI : NSObject
{
    NSCondition* _cond;
    int _count;
}
-(void) waitForCount:(int)count;
@end

@interface TestACMTestIntfI : TestACMTestIntf<TestACMTestIntf>
{
    NSCondition* _cond;
    ConnectionCallbackI* _callback;
}
@end
