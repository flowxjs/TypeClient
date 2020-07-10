import React, { useState } from 'react';
import { ReactApplication } from '../react';
import { Context } from '@typeclient/core';

export function CreateGlobalComponent(app: ReactApplication): React.FunctionComponent {
  let onSetProps: React.Dispatch<React.SetStateAction<Context<any>>>;
  let onSetComponent: React.Dispatch<React.SetStateAction<React.FunctionComponent<any>>>;
  app.on('React.component', component => {
    if (onSetComponent) onSetComponent(component);
  });
  app.on('React.props', context => {
    if (onSetProps) onSetProps(context);
  });
  return () => {
    const [Component, setComponent] = useState<React.FunctionComponent<any>>(null);
    const [Props, setProps] = useState<Context<any>>(null);
    if (!onSetComponent) onSetComponent = setComponent;
    if (!onSetProps) onSetProps = setProps;
    return Component
      ? React.createElement(Component, Props) 
      : null;
  }
}