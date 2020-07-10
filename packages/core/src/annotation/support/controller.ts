import { ClassMetaCreator } from "../implemention";
import { injectable } from "inversify";
import { NAMESPACE } from "./namespace";

export function Controller(url: string = '/') {
  return ClassMetaCreator.join(
    injectable(),
    ClassMetaCreator.define(NAMESPACE.CONTROLLER, url)
  )
}