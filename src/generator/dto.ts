import {Model, Property, Schema} from "@automatons/parser";
import {OptionalKind, DecoratorStructure} from "ts-morph";
import {render} from "./render";
import {schemaToType} from "./schema";

type Deco = {name: string; args?: string[]; from: "class-validator" | "class-transformer"};

const enumValues = (values: ReadonlyArray<string>): string => `[${values.map((value) => `"${value}"`).join(", ")}]`;

/** Collect the class-validator / class-transformer decorators for a single schema. */
const typeDecorators = (schema: Schema, decos: Deco[], each: boolean): void => {
  const eachArg = each ? "{ each: true }" : undefined;
  const validationArgs = (head?: string): string[] => {
    if (each) return head ? [head, "{ each: true }"] : ["undefined", "{ each: true }"];
    return head ? [head] : [];
  };
  switch (schema.type) {
    case "model":
      decos.push({name: "ValidateNested", from: "class-validator", args: eachArg ? [eachArg] : []});
      decos.push({name: "Type", from: "class-transformer", args: [`() => ${schema.name}`]});
      break;
    case "array":
      decos.push({name: "IsArray", from: "class-validator"});
      if (schema.items) typeDecorators(schema.items, decos, true);
      break;
    case "boolean":
      decos.push({name: "IsBoolean", from: "class-validator", args: eachArg ? [eachArg] : []});
      break;
    case "integer":
    case "number":
      decos.push({name: "IsNumber", from: "class-validator", args: validationArgs("{}")});
      break;
    case "string":
      if (schema.enum && schema.enum.length) {
        decos.push({name: "IsIn", from: "class-validator", args: validationArgs(enumValues(schema.enum))});
      } else if (schema.format === "date" || schema.format === "date-time") {
        decos.push({name: "IsDate", from: "class-validator", args: eachArg ? [eachArg] : []});
        decos.push({name: "Type", from: "class-transformer", args: ["() => Date"]});
      } else if (schema.format === "url") {
        decos.push({name: "IsUrl", from: "class-validator", args: validationArgs()});
      } else {
        decos.push({name: "IsString", from: "class-validator", args: eachArg ? [eachArg] : []});
      }
      break;
    case "object":
      decos.push({name: "IsObject", from: "class-validator", args: eachArg ? [eachArg] : []});
      break;
    default:
      // allOf / oneOf / anyOf: compile-time type only, no runtime decorator.
      break;
  }
};

const propertyDecorators = (property: Property): Deco[] => {
  const decos: Deco[] = [];
  if (!property.required) decos.push({name: "IsOptional", from: "class-validator"});
  typeDecorators(property.schema, decos, false);
  return decos;
};

const toStructure = (deco: Deco): OptionalKind<DecoratorStructure> => ({
  name: deco.name,
  arguments: deco.args ?? [],
});

const isObjectModel = (model: Model): boolean =>
  model.schema.type === "object" && Boolean(model.schema.properties && model.schema.properties.length);

/**
 * Emit a single dto file: a decorated DTO class for object schemas, or a type alias otherwise.
 */
export const emitDto = (model: Model): string =>
  render((sf) => {
    if (!isObjectModel(model)) {
      model.imports.forEach((imported) =>
        sf.addImportDeclaration({isTypeOnly: true, namedImports: [imported.title], moduleSpecifier: `./${imported.filename}`}),
      );
      sf.addTypeAlias({isExported: true, name: model.title, type: schemaToType(model.schema)});
      return;
    }

    const properties = (model.schema.type === "object" && model.schema.properties) || [];
    const propertyDecos = properties.map((property) => ({property, decos: propertyDecorators(property)}));

    const validators = new Set<string>();
    let usesType = false;
    propertyDecos.forEach(({decos}) =>
      decos.forEach((deco) => {
        if (deco.from === "class-transformer") usesType = true;
        else validators.add(deco.name);
      }),
    );

    if (validators.size) {
      sf.addImportDeclaration({namedImports: [...validators].sort(), moduleSpecifier: "class-validator"});
    }
    if (usesType) {
      sf.addImportDeclaration({namedImports: ["Type"], moduleSpecifier: "class-transformer"});
    }
    model.imports.forEach((imported) =>
      sf.addImportDeclaration({namedImports: [imported.title], moduleSpecifier: `./${imported.filename}`}),
    );

    const dtoClass = sf.addClass({isExported: true, name: model.title});
    propertyDecos.forEach(({property, decos}) =>
      dtoClass.addProperty({
        name: property.name.includes("-") ? `"${property.name}"` : property.name,
        type: schemaToType(property.schema),
        hasQuestionToken: !property.required,
        hasExclamationToken: property.required,
        decorators: decos.map(toStructure),
      }),
    );
  });

/**
 * Emit dto/index.ts re-exporting every dto.
 */
export const emitDtoIndex = (models: Model[]): string =>
  render((sf) => models.forEach((model) => sf.addExportDeclaration({moduleSpecifier: `./${model.filename}`})));
