import {Api} from "@automatons/parser";
import {OptionalKind, DecoratorStructure, Scope} from "ts-morph";
import {render} from "./render";
import {
  baseFilename,
  baseName,
  endpointParams,
  methodDecorator,
  referencedModels,
  responseType,
  routePath,
} from "./meta";

const paramDecorator = (decorator: {name: string; argument?: string}): OptionalKind<DecoratorStructure> => ({
  name: decorator.name,
  arguments: decorator.argument ? [decorator.argument] : [],
});

/**
 * Emit controllers/<tag>.controller.ts: a @Controller that wires the routes and delegates
 * each operation to the injected abstract service.
 */
export const emitController = (api: Api): string =>
  render((sf) => {
    const base = baseName(api);

    const nestImports = new Set<string>(["Controller"]);
    api.paths.forEach((path) => {
      nestImports.add(methodDecorator(path.method));
      endpointParams(path).forEach((param) => nestImports.add(param.decorator.name));
    });
    sf.addImportDeclaration({namedImports: [...nestImports].sort(), moduleSpecifier: "@nestjs/common"});

    sf.addImportDeclaration({namedImports: [`${base}Service`], moduleSpecifier: "../services"});

    const models = referencedModels(api);
    if (models.length) {
      sf.addImportDeclaration({namedImports: models.map((model) => model.title), moduleSpecifier: "../dto"});
    }

    const controllerClass = sf.addClass({
      isExported: true,
      name: `${base}Controller`,
      decorators: [{name: "Controller", arguments: []}],
    });
    controllerClass.addConstructor({
      parameters: [{name: "service", type: `${base}Service`, scope: Scope.Private, isReadonly: true}],
    });

    api.paths.forEach((path) => {
      const params = endpointParams(path);
      controllerClass.addMethod({
        name: path.name,
        decorators: [{name: methodDecorator(path.method), arguments: [`"${routePath(path.path)}"`]}],
        parameters: params.map((param) => ({
          name: param.id,
          type: param.type,
          hasQuestionToken: param.optional,
          decorators: [paramDecorator(param.decorator)],
        })),
        returnType: `Promise<${responseType(path)}>`,
        statements: [`return this.service.${path.name}(${params.map((param) => param.id).join(", ")});`],
      });
    });
  });

/**
 * Emit controllers/index.ts re-exporting every controller.
 */
export const emitControllersIndex = (apis: Api[]): string =>
  render((sf) => apis.forEach((api) => sf.addExportDeclaration({moduleSpecifier: `./${baseFilename(api)}.controller`})));
