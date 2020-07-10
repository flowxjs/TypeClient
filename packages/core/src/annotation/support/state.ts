import { MethodMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";

export function State<T = any>(state: T | (() => T)) {
  return MethodMetaCreator.define(NAMESPACE.STATE, state || {});
}