import { Context } from "../../application";
import { ClassMetaCreator, MethodMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";

export function onContextCreated<T extends Context>(...callbacks: ((ctx: T) => void)[]) {
  return <T>(target: any, property?: string | symbol, descripor?: TypedPropertyDescriptor<T>) => {
    if (!property) return ClassMetaCreator.unshift(NAMESPACE.CONTEXTCREATED, ...callbacks)(target);
    return MethodMetaCreator.unshift(NAMESPACE.CONTEXTCREATED, ...callbacks)(target, property, descripor);
  }
}