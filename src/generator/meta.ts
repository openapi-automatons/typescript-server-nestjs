import {AffectPath, Api, Model, Path, Schema} from "@automatons/parser";
import {schemaToType} from "./schema";

/** `PetsApi` -> `Pets` (the controller/service base name). */
export const baseName = (api: Api): string => api.title.replace(/Api$/, "");
/** `petsApi` -> `pets` (the controller/service file name). */
export const baseFilename = (api: Api): string => api.filename.replace(/Api$/, "");

/** Map an HTTP method to its `@nestjs/common` route decorator. */
export const methodDecorator = (method: string): string => {
  const map: Record<string, string> = {
    get: "Get",
    post: "Post",
    put: "Put",
    patch: "Patch",
    delete: "Delete",
    head: "Head",
    options: "Options",
  };
  return map[method.toLowerCase()] ?? "All";
};

/** `/pets/{petId}` -> `pets/:petId` (a NestJS route path). */
export const routePath = (path: string): string => path.replace(/^\//, "").replace(/\{([^}]+)}/g, ":$1");

/** Make an OpenAPI parameter name safe to use as a JS identifier. */
export const identifier = (name: string): string => name.replace(/[^A-Za-z0-9_$]/g, "_");

const isAffect = (path: Path): path is AffectPath => "forms" in path;

export type EndpointParam = {
  id: string;
  type: string;
  optional: boolean;
  decorator: {name: string; argument?: string};
};

/** Build the (decorator-aware) parameter list for an operation, required-first. */
export const endpointParams = (path: Path): EndpointParam[] => {
  const params: EndpointParam[] = [];

  (path.parameters ?? []).forEach((parameter) =>
    params.push({
      id: identifier(parameter.name),
      type: schemaToType(parameter.schema),
      optional: false,
      decorator: {name: "Param", argument: `"${parameter.name}"`},
    }),
  );

  const forms = isAffect(path) ? (path.forms ?? []) : [];
  if (forms.length) {
    params.push({
      id: "body",
      type: forms.map((form) => schemaToType(form.schema)).join(" | "),
      optional: !forms.some((form) => form.required),
      decorator: {name: "Body"},
    });
  }

  (path.queries ?? []).forEach((query) =>
    params.push({
      id: identifier(query.name),
      type: schemaToType(query.schema),
      optional: !query.required,
      decorator: {name: "Query", argument: `"${query.name}"`},
    }),
  );

  return params.sort((a, b) => Number(a.optional) - Number(b.optional));
};

/** The response type of an operation (`void` when there is no body schema). */
export const responseType = (path: Path): string => (path.schema ? schemaToType(path.schema) : "void");

const collectFromSchema = (schema: Schema | undefined, names: Set<string>): void => {
  if (!schema) return;
  switch (schema.type) {
    case "model":
      names.add(schema.name);
      break;
    case "array":
      collectFromSchema(schema.items, names);
      break;
    case "object":
      (schema.properties ?? []).forEach((property) => collectFromSchema(property.schema, names));
      break;
    case "allOf":
    case "oneOf":
    case "anyOf":
      schema.schemas.forEach((inner) => collectFromSchema(inner, names));
      break;
    default:
      break;
  }
};

/** The DTO models actually referenced by an api's operation signatures. */
export const referencedModels = (api: Api): Model[] => {
  const names = new Set<string>();
  api.paths.forEach((path) => {
    (path.parameters ?? []).forEach((parameter) => collectFromSchema(parameter.schema, names));
    (path.queries ?? []).forEach((query) => collectFromSchema(query.schema, names));
    if (isAffect(path)) (path.forms ?? []).forEach((form) => collectFromSchema(form.schema, names));
    collectFromSchema(path.schema, names);
  });
  return api.imports.filter((model) => names.has(model.title));
};
