import { Organization, Thing, WithContext } from "https://esm.sh/schema-dts";
import { resolve, join } from "https://deno.land/std@0.121.0/path/mod.ts";
import { ROOT_DOMAIN, SEPARATOR } from "./constant.ts";
import { ensureFile } from "https://deno.land/std@0.121.0/fs/mod.ts";
import schema from "../common/schema-org.js";
const isDev = Deno.env.get("ENV") === "dev";

export function getDateString(date: Date) {
  const { year, month, day } = getYearMonthDay(date);
  return `${year}-${month}-${day}`;
}
export function getYearMonthDay(date: Date) {
  const year = date.getUTCFullYear();
  const month = addZero(date.getUTCMonth() + 1);
  const day = addZero(date.getUTCDate());
  return {
    year,
    month,
    day,
  };
}
export function addZero(number: number) {
  return ("0" + number).slice(-2);
}

export function getJsonLd<T extends Thing>(json: T): string {
  (json as unknown as Record<string, string>)["@context"] =
    "https://schema.org";
  const jsonWithContext: WithContext<T> = json as WithContext<T>;
  return `<script type="application/ld+json">
${JSON.stringify(jsonWithContext)}
</script>`;
}

export function getCwdPath(): string {
  const dirname = new URL(".", import.meta.url).pathname;
  return resolve(dirname, "../");
}
export function getDataFilePath(relativePath: string): string {
  // const cwd = getCwdPath();
  // check dev
  if (isDev) {
    return join("./dev-sources", relativePath);
  } else {
    return join("./sources", relativePath);
  }
}
export function stringifyIdentifier(
  date: Date,
  sourceLanguage: string,
  publisherName: string,
  siteIdentifier: string,
  postType: string,
  originalId: string
): string {
  const { year, month, day } = getYearMonthDay(date);
  const identifierPrefix =
    year +
    SEPARATOR +
    month +
    SEPARATOR +
    day +
    SEPARATOR +
    sourceLanguage +
    SEPARATOR +
    siteIdentifier +
    SEPARATOR +
    publisherName +
    SEPARATOR +
    postType;
  const identifier = identifierPrefix + SEPARATOR + originalId;
  return identifier;
}
export function getPathIdentifierByIdentifier(identifier: string): string {
  const parts = identifier.split(SEPARATOR);
  const part0 = parts[0];
  if (part0.startsWith("t")) {
    parts.shift();
  }
  const identifierPrefix = parts.slice(0, -1).join(SEPARATOR);
  const pathIdentifier =
    identifierPrefix.split(SEPARATOR).join("/") + "/" + identifier;
  return pathIdentifier;
}
export interface IdentifierObj {
  year: string;
  month: string;
  day: string;
  language: string;
  publisherName: string;
  siteIdentifier: string;
  postType: string;
  originalId: string;
  dateCreated?: Date;
}
export function parseIdentifier(identifier: string): IdentifierObj {
  const parts = identifier.split(SEPARATOR);
  const part0 = parts[0];
  let dateCreated: Date | undefined;
  if (part0.startsWith("t")) {
    parts.shift();
    dateCreated = new Date(parseInt(part0.slice(1), 10));
  }
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const sourceLanguage = parts[3];
  const siteIdentifier = parts[4];
  const publisherName = parts[5];
  const postType = parts[6];
  const originalId = parts[7];
  const obj: IdentifierObj = {
    year,
    month,
    day,
    language: sourceLanguage,
    publisherName,
    siteIdentifier,
    postType,
    originalId,
  };
  if (dateCreated) {
    obj.dateCreated = dateCreated;
  }
  return obj;
}

export async function writeJson(path: string, data: unknown) {
  console.log("writing json to", path);
  await ensureFile(path);
  await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
}

export async function getJson(path: string, data: unknown) {}
// Native
export const get = (obj: unknown, path: string, defaultValue = undefined) => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) =>
          res !== null && res !== undefined
            ? (res as Record<string, string>)[key]
            : res,
        obj
      );
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};
const CONTEXTS = {
  "https://schema.org": schema,
};

export const customLoader = async (url: string) => {
  if (url in CONTEXTS) {
    return {
      contextUrl: null, // this is for a context via a link header
      document: (CONTEXTS as Record<string, unknown>)[url], // this is the actual document that was loaded
      documentUrl: url, // this is the actual context URL after redirects
    };
  }

  const theUrl = `${url}/docs/jsonldcontext.jsonld`;
  let result = await fetch(theUrl, {
    headers: {
      accept: "application/ld+json, application/json",
    },
  });
  result = await result.json();
  return {
    contextUrl: null, // this is for a context via a link header
    document: result,
    documentUrl: url, // this is the actual context URL after redirects
  };
};

export function getFinalHeadline(item: unknown, headline: string): string {
  const name = get(item, "name");
  const genre = get(item, "genre");
  let title = ``;
  if (genre) {
    title += `${genre}: `;
  }
  if (name) {
    title += `${name} - `;
  }
  if (headline) {
    title += headline;
  }

  return title;
}
