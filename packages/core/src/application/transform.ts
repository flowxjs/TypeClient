import { Context } from "./context";
import { MiddlewareTransforms } from "./transforms/middleware";
import { TAnnotationScanerMethod } from "../annotation";
import { ExceptionConsumer } from "./transforms/expception";
export async function ContextTransforming<T extends object = {}>(ctx: Context<T>, method: TAnnotationScanerMethod) {
  const middlewareConsumer = new MiddlewareTransforms();
  return await middlewareConsumer.compose(ctx, method)
    .catch((e: Error) => {
      const consumer = new ExceptionConsumer();
      return consumer.catch(e, method, ctx);
    });
}