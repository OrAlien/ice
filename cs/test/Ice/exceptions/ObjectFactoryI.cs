// **********************************************************************
//
// Copyright (c) 2003-2004 ZeroC, Inc. All rights reserved.
//
// This copy of Ice is licensed to you under the terms described in the
// ICE_LICENSE file included in this distribution.
//
// **********************************************************************


public sealed class ObjectFactoryI : Ice.LocalObjectImpl, Ice.ObjectFactory
{
    public Ice.Object create(string s)
    {
	return null;
    }
    
    public void destroy()
    {
    }
}
