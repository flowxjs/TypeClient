import React from 'react';
import { ClassMetaCreator } from '@typeclient/core';
import { NAMESPACE } from './namespace';
export function Template<T extends React.FunctionComponent | React.ComponentClass>(component: T) {
  return ClassMetaCreator.define(NAMESPACE.TEMPLATE, component);
}