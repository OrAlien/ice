// **********************************************************************
//
// Copyright (c) 2003-2004 ZeroC, Inc. All rights reserved.
//
// This copy of Ice is licensed to you under the terms described in the
// ICE_LICENSE file included in this distribution.
//
// **********************************************************************


public sealed class IAI : MA._IADisp
{
    public IAI()
    {
    }
    
    public override MA.IAPrx iaop(MA.IAPrx p, Ice.Current current)
    {
        return p;
    }
}
