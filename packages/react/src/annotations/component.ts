import { MethodMetaCreator } from "@typeclient/core";
import { NAMESPACE } from "./namespace";

export function Component() {
  return MethodMetaCreator.define(NAMESPACE.COMPONENT, true);
}