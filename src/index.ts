import {Automaton} from "@automatons/tools";
import {generate} from "./generator";

const generatorTypescriptNestjsServer: Automaton = (openapi, settings) =>
  generate(openapi, settings);

export default generatorTypescriptNestjsServer;
