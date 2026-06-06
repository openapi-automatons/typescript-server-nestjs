import {AutomatonSettings, Openapi} from "@automatons/tools";
import {parser} from "@automatons/parser";
import {render, write} from "./render";
import {emitDto, emitDtoIndex} from "./dto";
import {emitService, emitServicesIndex} from "./service";
import {emitController, emitControllersIndex} from "./controller";
import {baseFilename} from "./meta";

const emitIndex = (hasDto: boolean, hasApis: boolean): string =>
  render((sf) => {
    if (hasDto) sf.addExportDeclaration({moduleSpecifier: "./dto"});
    if (hasApis) {
      sf.addExportDeclaration({moduleSpecifier: "./services"});
      sf.addExportDeclaration({moduleSpecifier: "./controllers"});
    }
  });

export const generate = async (openapi: Openapi, settings: AutomatonSettings): Promise<void[]> => {
  const {outDir} = settings;
  const {models, apis} = await parser(openapi, settings);
  const tasks: Promise<void>[] = [];

  if (models.length) {
    tasks.push(write(outDir, "dto/index.ts", emitDtoIndex(models)));
    models.forEach((model) => tasks.push(write(outDir, `dto/${model.filename}.ts`, emitDto(model))));
  }

  if (apis.length) {
    tasks.push(write(outDir, "services/index.ts", emitServicesIndex(apis)));
    tasks.push(write(outDir, "controllers/index.ts", emitControllersIndex(apis)));
    apis.forEach((api) => {
      tasks.push(write(outDir, `services/${baseFilename(api)}.service.ts`, emitService(api)));
      tasks.push(write(outDir, `controllers/${baseFilename(api)}.controller.ts`, emitController(api)));
    });
  }

  tasks.push(write(outDir, "index.ts", emitIndex(models.length > 0, apis.length > 0)));

  return Promise.all(tasks);
};
