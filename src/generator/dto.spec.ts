import {describe, expect, it} from "vitest";
import {Model} from "@automatons/parser";
import {emitDto} from "./dto";

const model = {
  filename: "pet",
  title: "Pet",
  imports: [{filename: "category", title: "Category", imports: [], schema: {type: "object", properties: []}}],
  schema: {
    type: "object",
    properties: [
      {name: "id", required: true, schema: {type: "integer"}},
      {name: "name", required: true, schema: {type: "string"}},
      {name: "category", required: false, schema: {type: "model", name: "Category"}},
      {name: "tags", required: false, schema: {type: "array", items: {type: "string"}}},
      {name: "status", required: false, schema: {type: "string", enum: ["available", "sold"]}},
    ],
  },
} as unknown as Model;

describe("emitDto", () => {
  const out = emitDto(model);

  it("emits a decorated DTO class", () => {
    expect(out).toContain("export class Pet");
    expect(out).toContain("id!: number");
    expect(out).toContain("@IsNumber({})");
    expect(out).toContain("@IsString()");
  });

  it("marks optional properties with @IsOptional", () => {
    expect(out).toContain("@IsOptional()");
    expect(out).toContain("category?:");
  });

  it("validates nested models and arrays", () => {
    expect(out).toContain("@ValidateNested()");
    expect(out).toContain("@Type(() => Category)");
    expect(out).toContain("@IsArray()");
    expect(out).toContain('@IsIn(["available", "sold"])');
  });

  it("imports the decorators it uses", () => {
    expect(out).toContain('from "class-validator"');
    expect(out).toContain('import { Type } from "class-transformer"');
    expect(out).toContain('import { Category } from "./category"');
  });
});

describe("emitDto type alias", () => {
  it("emits a type alias for non-object models", () => {
    const enumModel = {
      filename: "status",
      title: "Status",
      imports: [],
      schema: {type: "string", enum: ["a", "b"]},
    } as unknown as Model;
    expect(emitDto(enumModel)).toContain('export type Status = "a" | "b"');
  });
});
