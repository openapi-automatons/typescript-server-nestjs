# @automatons/typescript-server-nestjs
[![CI/CD](https://github.com/openapi-automatons/typescript-server-nestjs/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/openapi-automatons/typescript-server-nestjs/actions/workflows/ci-cd.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm downloads](https://img.shields.io/npm/dw/@automatons/typescript-server-nestjs)](https://www.npmjs.com/package/@automatons/typescript-server-nestjs)

## What is @automatons/typescript-server-nestjs
This is a server generator that emits [NestJS](https://nestjs.com) controllers, validated DTOs and
service contracts from an OpenAPI document.
Only use openapi-automatons.

This package is **ESM-only** and requires **Node.js >= 22**.

It is **contract-first and non-destructive**: every file it writes is safe to regenerate, because your
business logic lives in your own service implementations, not in the generated code. For each tag it emits:

- `dto/` — `class-validator` / `class-transformer` decorated DTO classes (object schemas) and type aliases,
- `services/<tag>.service.ts` — an **abstract** `<Tag>Service` class declaring the methods you must implement,
- `controllers/<tag>.controller.ts` — a `@Controller()` that wires the routes and delegates to the injected service.

You implement the abstract service and wire it into your own module — regenerating never touches that code.

`@nestjs/common`, `class-validator` and `class-transformer` are peer dependencies.

## Generated server
```ts
// your code — implement the generated contract
import { Injectable } from "@nestjs/common";
import { PetsService } from "./generated/services";
import { Pet } from "./generated/dto";

@Injectable()
export class PetsServiceImpl extends PetsService {
  async showPetById(petId: string): Promise<Pet> {
    // ...your logic
  }
}

// wire it in your module
@Module({
  controllers: [PetsController],
  providers: [{ provide: PetsService, useClass: PetsServiceImpl }],
})
export class PetsModule {}
```

## How can I use @automatons/typescript-server-nestjs?
This library is designed to be used by [openapi-automatons](https://github.com/openapi-automatons/openapi-automatons).
Please read the [readme](https://github.com/openapi-automatons/openapi-automatons/blob/main/README.md) of [openapi-automatons](https://github.com/openapi-automatons/openapi-automatons) for how to use it.
