<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Authentication and authorization

Copy `.env.example` to `.env` and replace both JWT secrets with distinct, long random values. Configure SMTP before production; in non-production, OTP values are written to the application log to make local development possible.

Public authentication endpoints are under `/auth`:

- `POST /auth/register`, then `POST /auth/verify-email`
- `POST /auth/login`, `POST /auth/refresh`, and `POST /auth/logout`
- `POST /auth/forgot-password` and `POST /auth/reset-password`
- `GET /auth/me` with `Authorization: Bearer <accessToken>`

Access tokens expire after 15 minutes by default. Submit the refresh token to `/auth/refresh` to receive a rotated access/refresh-token pair. A password reset and logout revoke the stored refresh token.

Use `JwtAuthGuard` to protect a route, then add `Roles('admin')` and/or `Permissions('contracts.read')`. Combine them with `RolesGuard` and `PermissionsGuard`; all declared permissions are required. The token carries the role and active permissions at sign-in time, so permission changes take effect on the user's next token refresh (at most the access-token lifetime).

Existing management endpoints are protected: `/role` and `/permission` require the `admin` role; `/user` requires `users.create|read|update|delete`; and `/contract` requires the analogous `contracts.*` permissions. Seed the first `admin` role/user directly in the database (or through a controlled deployment migration), then assign permissions using the protected role endpoints.

## Database model

The TypeORM model follows `acms(1).png` and includes:

- `contract`, `property`, and the `contract_property` junction table
- contract-owned `regulation`, `auction_result`, and `announcement` records
- `user`, `role`, `permission`, and `role_permissions`
- `configuration`
- S3-backed `file` metadata

Run `script.sql` against a fresh PostgreSQL database to create the baseline
schema. `DB_SYNCHRONIZE` defaults to disabled because automatic schema changes
are unsafe outside disposable local databases.

### S3 / MinIO files

File bytes are stored in S3-compatible object storage and their metadata is
stored in PostgreSQL. Configure AWS S3 with the normal AWS credential provider
chain, or configure the local MinIO container with:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=demo-1
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=admin
AWS_SECRET_ACCESS_KEY=admin123
FILE_MAX_SIZE_BYTES=26214400
```

Create `demo-1` in the MinIO console at `http://localhost:9001` before the
first upload. In Swagger, `POST /file` accepts `multipart/form-data` and shows
a file chooser. `GET /file/:id/download` streams the object, `PATCH /file/:id`
assigns it to an entity, and `DELETE /file/:id` removes both the object and its
database metadata.

`entity_type/entity_id` is intentionally polymorphic, so PostgreSQL cannot
apply one foreign key to it. Service-level validation should restrict
`entity_type` to supported attachment owners.
