import React from 'react';
import { Context } from '@typeclient/core';
export type TReactApplicationLifecycles = {
  'React.component': {
    arguments: [() => React.FunctionComponent],
    return: void,
  },
  'React.slot': {
    arguments: [() => React.FunctionComponent],
    return: void,
  },
  'React.props': {
    arguments: [Context<any>],
    return: void,
  }
}