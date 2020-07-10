import Url from 'url-parse';

export type TRequestParams = { [key: string]: string };

export class Request extends Url {
  public params: TRequestParams = {};
  public referer: string | null;
  public readonly method = 'GET';

  constructor(url: string) {
    super(url, true);
  }
}