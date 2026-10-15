/**
 * Gerado por `pnpm migrate:types` (kysely-codegen) e ajustado manualmente.
 * O codegen preserva os ajustes (enums, ColumnType) e só adiciona/remove campos.
 */

import type { ColumnType, GeneratedAlways, Selectable, Insertable, Updateable } from 'kysely';
export { ColumnType, GeneratedAlways, Selectable, Insertable, Updateable };

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U> ? ColumnType<S, I | undefined, U> : ColumnType<T, T | undefined, T>;

export type Json = JsonValue;

export type JsonArray = JsonValue[];

export type JsonObject = {
  [x: string]: JsonValue | undefined;
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type Timestamp = ColumnType<Date, Date | string | undefined>;
export type TimestampzCreatedAndUpdated = ColumnType<Date, Date | string | undefined, Date | string | undefined>;
export type TimestampzDeleted = ColumnType<Date | null, Date | string | undefined, Date | string | undefined>;
/** Coluna `date` opcional: volta como texto `AAAA-MM-DD` (ver `src/configs/db/index.ts`). */
export type DateNullable = ColumnType<string | null, string | null | undefined, string | null>;

/**
 * Organization
 */
export enum eOrganizationStatus {
  active = 'active',
  inactive = 'inactive',
  blocked = 'blocked',
}

export interface iOrganization {
  uuid: Generated<string>;
  name: ColumnType<string>;
  document: ColumnType<string>;
  status: ColumnType<eOrganizationStatus, eOrganizationStatus | undefined>;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
  deleted_at: TimestampzDeleted;
}

export type tOrganizationInsertable = Insertable<iOrganization>;
export type tOrganizationUpdatable = Updateable<iOrganization>;
export type tOrganizationSelectable = Selectable<iOrganization>;

/**
 * Service Account
 */
export enum eServiceAccountRole {
  admin = 'admin',
  viewer = 'viewer',
}

export enum eServiceAccountStatus {
  active = 'active',
  revoked = 'revoked',
}

export interface iServiceAccount {
  uuid: Generated<string>;
  organization_uuid: ColumnType<string>;
  name: ColumnType<string>;
  role: ColumnType<eServiceAccountRole>;
  client_id: ColumnType<string>;
  client_secret_hash: ColumnType<string>;
  status: ColumnType<eServiceAccountStatus, eServiceAccountStatus | undefined>;
  last_used_at: TimestampzDeleted;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
  deleted_at: TimestampzDeleted;
}

export type tServiceAccountInsertable = Insertable<iServiceAccount>;
export type tServiceAccountUpdatable = Updateable<iServiceAccount>;
export type tServiceAccountSelectable = Selectable<iServiceAccount>;

/**
 * Refresh Token
 */
export interface iRefreshToken {
  uuid: Generated<string>;
  service_account_uuid: ColumnType<string>;
  family_uuid: ColumnType<string>;
  token_hash: ColumnType<string>;
  expires_at: Timestamp;
  revoked_at: ColumnType<Date | null, Date | string | null | undefined>;
  replaced_by_uuid: ColumnType<string | null, string | null | undefined>;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
}

export type tRefreshTokenSelectable = Selectable<iRefreshToken>;

/**
 * Audit Log
 */
export interface iAuditLog {
  uuid: Generated<string>;
  organization_uuid: ColumnType<string>;
  service_account_uuid: ColumnType<string | null, string | null | undefined>;
  action: ColumnType<string>;
  entity: ColumnType<string>;
  entity_uuid: ColumnType<string | null, string | null | undefined>;
  request_id: ColumnType<string | null, string | null | undefined>;
  metadata: ColumnType<Json, string | undefined>;
  created_at: TimestampzCreatedAndUpdated;
}

/**
 * Planet
 */
export enum ePlanetRegion {
  core_worlds = 'core_worlds',
  inner_rim = 'inner_rim',
  mid_rim = 'mid_rim',
  outer_rim = 'outer_rim',
  wild_space = 'wild_space',
  unknown_regions = 'unknown_regions',
}

export interface iPlanet {
  uuid: Generated<string>;
  organization_uuid: ColumnType<string>;
  name: ColumnType<string>;
  region: ColumnType<ePlanetRegion, ePlanetRegion | undefined>;
  climate: ColumnType<string | null, string | null | undefined>;
  terrain: ColumnType<string | null, string | null | undefined>;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
  deleted_at: TimestampzDeleted;
}

export type tPlanetInsertable = Insertable<iPlanet>;
export type tPlanetUpdatable = Updateable<iPlanet>;
export type tPlanetSelectable = Selectable<iPlanet>;

/**
 * Character
 */
export enum eCharacterAffiliation {
  jedi = 'jedi',
  sith = 'sith',
  galactic_republic = 'galactic_republic',
  galactic_empire = 'galactic_empire',
  rebel_alliance = 'rebel_alliance',
  first_order = 'first_order',
  resistance = 'resistance',
  bounty_hunter = 'bounty_hunter',
  independent = 'independent',
}

export interface iCharacter {
  uuid: Generated<string>;
  organization_uuid: ColumnType<string>;
  planet_uuid: ColumnType<string | null, string | null | undefined>;
  name: ColumnType<string>;
  species: ColumnType<string, string | undefined>;
  affiliation: ColumnType<eCharacterAffiliation, eCharacterAffiliation | undefined>;
  is_force_sensitive: ColumnType<boolean, boolean | undefined>;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
  deleted_at: TimestampzDeleted;
}

export type tCharacterInsertable = Insertable<iCharacter>;
export type tCharacterUpdatable = Updateable<iCharacter>;
export type tCharacterSelectable = Selectable<iCharacter>;

/**
 * Actor
 */
export enum eActorStatus {
  active = 'active',
  retired = 'retired',
  in_memoriam = 'in_memoriam',
}

export interface iActor {
  uuid: Generated<string>;
  organization_uuid: ColumnType<string>;
  name: ColumnType<string>;
  birth_date: DateNullable;
  nationality: ColumnType<string | null, string | null | undefined>;
  status: ColumnType<eActorStatus, eActorStatus | undefined>;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
  deleted_at: TimestampzDeleted;
}

export type tActorInsertable = Insertable<iActor>;
export type tActorUpdatable = Updateable<iActor>;
export type tActorSelectable = Selectable<iActor>;

/**
 * Film
 */
export enum eFilmCategory {
  skywalker_saga = 'skywalker_saga',
  anthology = 'anthology',
}

export interface iFilm {
  uuid: Generated<string>;
  organization_uuid: ColumnType<string>;
  title: ColumnType<string>;
  category: ColumnType<eFilmCategory, eFilmCategory | undefined>;
  episode: ColumnType<number | null, number | null | undefined>;
  director: ColumnType<string>;
  release_date: ColumnType<string>;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
  deleted_at: TimestampzDeleted;
}

export type tFilmInsertable = Insertable<iFilm>;
export type tFilmUpdatable = Updateable<iFilm>;
export type tFilmSelectable = Selectable<iFilm>;

/**
 * Casting
 */
export enum eCastingRoleType {
  main = 'main',
  supporting = 'supporting',
  voice = 'voice',
  cameo = 'cameo',
}

export interface iCasting {
  uuid: Generated<string>;
  organization_uuid: ColumnType<string>;
  film_uuid: ColumnType<string>;
  actor_uuid: ColumnType<string>;
  character_uuid: ColumnType<string>;
  role_type: ColumnType<eCastingRoleType, eCastingRoleType | undefined>;
  created_at: TimestampzCreatedAndUpdated;
  updated_at: TimestampzCreatedAndUpdated;
  deleted_at: TimestampzDeleted;
}

export type tCastingInsertable = Insertable<iCasting>;
export type tCastingUpdatable = Updateable<iCasting>;
export type tCastingSelectable = Selectable<iCasting>;

export interface DB {
  organization: iOrganization;
  service_account: iServiceAccount;
  refresh_token: iRefreshToken;
  audit_log: iAuditLog;
  planet: iPlanet;
  character: iCharacter;
  actor: iActor;
  film: iFilm;
  casting: iCasting;
}
