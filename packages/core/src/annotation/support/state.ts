import { MethodMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";

export function State<T = {}>(state: T) {
  return MethodMetaCreator.define(NAMESPACE.STATE, () => state || {});
}