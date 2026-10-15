import { Kysely } from 'kysely';

// service
import { OrganizationService } from '@services/organization';

// types
import {
  DB,
  eActorStatus,
  eCastingRoleType,
  eCharacterAffiliation,
  eFilmCategory,
  ePlanetRegion,
} from '@database/db/model';

/** Organização de demonstração criada pelo seed. */
const ORGANIZATION = { name: 'Jedi Archives', document: '11222333000181' };

const PLANETS = [
  { name: 'Tatooine', region: ePlanetRegion.outer_rim, climate: 'árido', terrain: 'deserto' },
  { name: 'Alderaan', region: ePlanetRegion.core_worlds, climate: 'temperado', terrain: 'pradarias e montanhas' },
  { name: 'Naboo', region: ePlanetRegion.mid_rim, climate: 'temperado', terrain: 'pântanos e planícies' },
  { name: 'Corellia', region: ePlanetRegion.core_worlds, climate: 'temperado', terrain: 'planícies e florestas' },
  { name: 'Kashyyyk', region: ePlanetRegion.mid_rim, climate: 'tropical', terrain: 'florestas' },
  { name: 'Dagobah', region: ePlanetRegion.outer_rim, climate: 'úmido', terrain: 'pântanos' },
  { name: 'Jakku', region: ePlanetRegion.inner_rim, climate: 'árido', terrain: 'deserto' },
  { name: 'Coruscant', region: ePlanetRegion.core_worlds, climate: 'temperado', terrain: 'cidade-planeta' },
] as const;

type tPlanetName = (typeof PLANETS)[number]['name'];

const CHARACTERS: {
  name: string;
  planet: tPlanetName | null;
  species?: string;
  affiliation: eCharacterAffiliation;
  is_force_sensitive?: boolean;
}[] = [
  { name: 'Luke Skywalker', planet: 'Tatooine', affiliation: eCharacterAffiliation.jedi, is_force_sensitive: true },
  {
    name: 'Leia Organa',
    planet: 'Alderaan',
    affiliation: eCharacterAffiliation.rebel_alliance,
    is_force_sensitive: true,
  },
  { name: 'Han Solo', planet: 'Corellia', affiliation: eCharacterAffiliation.rebel_alliance },
  { name: 'Chewbacca', planet: 'Kashyyyk', species: 'Wookiee', affiliation: eCharacterAffiliation.rebel_alliance },
  { name: 'Darth Vader', planet: 'Tatooine', affiliation: eCharacterAffiliation.sith, is_force_sensitive: true },
  { name: 'Anakin Skywalker', planet: 'Tatooine', affiliation: eCharacterAffiliation.jedi, is_force_sensitive: true },
  { name: 'Obi-Wan Kenobi', planet: null, affiliation: eCharacterAffiliation.jedi, is_force_sensitive: true },
  {
    name: 'Yoda',
    planet: 'Dagobah',
    species: 'Desconhecida',
    affiliation: eCharacterAffiliation.jedi,
    is_force_sensitive: true,
  },
  { name: 'Padmé Amidala', planet: 'Naboo', affiliation: eCharacterAffiliation.galactic_republic },
  { name: 'Sheev Palpatine', planet: 'Naboo', affiliation: eCharacterAffiliation.sith, is_force_sensitive: true },
  { name: 'Rey', planet: 'Jakku', affiliation: eCharacterAffiliation.resistance, is_force_sensitive: true },
  { name: 'Kylo Ren', planet: null, affiliation: eCharacterAffiliation.first_order, is_force_sensitive: true },
];

const ACTORS: { name: string; birth_date: string; nationality: string; status?: eActorStatus }[] = [
  { name: 'Mark Hamill', birth_date: '1951-09-25', nationality: 'Estados Unidos' },
  { name: 'Carrie Fisher', birth_date: '1956-10-21', nationality: 'Estados Unidos', status: eActorStatus.in_memoriam },
  { name: 'Harrison Ford', birth_date: '1942-07-13', nationality: 'Estados Unidos' },
  { name: 'Peter Mayhew', birth_date: '1944-05-19', nationality: 'Reino Unido', status: eActorStatus.in_memoriam },
  { name: 'David Prowse', birth_date: '1935-07-01', nationality: 'Reino Unido', status: eActorStatus.in_memoriam },
  {
    name: 'James Earl Jones',
    birth_date: '1931-01-17',
    nationality: 'Estados Unidos',
    status: eActorStatus.in_memoriam,
  },
  { name: 'Alec Guinness', birth_date: '1914-04-02', nationality: 'Reino Unido', status: eActorStatus.in_memoriam },
  { name: 'Frank Oz', birth_date: '1944-05-25', nationality: 'Reino Unido' },
  { name: 'Ewan McGregor', birth_date: '1971-03-31', nationality: 'Reino Unido' },
  { name: 'Natalie Portman', birth_date: '1981-06-09', nationality: 'Israel' },
  { name: 'Hayden Christensen', birth_date: '1981-04-19', nationality: 'Canadá' },
  { name: 'Ian McDiarmid', birth_date: '1944-08-11', nationality: 'Reino Unido' },
  { name: 'Daisy Ridley', birth_date: '1992-04-10', nationality: 'Reino Unido' },
  { name: 'Adam Driver', birth_date: '1983-11-19', nationality: 'Estados Unidos' },
];

const FILMS: { title: string; episode: number | null; director: string; release_date: string }[] = [
  { title: 'The Phantom Menace', episode: 1, director: 'George Lucas', release_date: '1999-05-19' },
  { title: 'Attack of the Clones', episode: 2, director: 'George Lucas', release_date: '2002-05-16' },
  { title: 'Revenge of the Sith', episode: 3, director: 'George Lucas', release_date: '2005-05-19' },
  { title: 'A New Hope', episode: 4, director: 'George Lucas', release_date: '1977-05-25' },
  { title: 'The Empire Strikes Back', episode: 5, director: 'Irvin Kershner', release_date: '1980-05-21' },
  { title: 'Return of the Jedi', episode: 6, director: 'Richard Marquand', release_date: '1983-05-25' },
  { title: 'The Force Awakens', episode: 7, director: 'J. J. Abrams', release_date: '2015-12-18' },
  { title: 'Rogue One', episode: null, director: 'Gareth Edwards', release_date: '2016-12-16' },
];

const { main, supporting, voice, cameo } = eCastingRoleType;

/** [filme, ator, personagem, tipo de participação] */
const CASTING: [string, string, string, eCastingRoleType][] = [
  ['The Phantom Menace', 'Ewan McGregor', 'Obi-Wan Kenobi', main],
  ['The Phantom Menace', 'Natalie Portman', 'Padmé Amidala', main],
  ['The Phantom Menace', 'Ian McDiarmid', 'Sheev Palpatine', supporting],
  ['The Phantom Menace', 'Frank Oz', 'Yoda', voice],
  ['Attack of the Clones', 'Ewan McGregor', 'Obi-Wan Kenobi', main],
  ['Attack of the Clones', 'Natalie Portman', 'Padmé Amidala', main],
  ['Attack of the Clones', 'Hayden Christensen', 'Anakin Skywalker', main],
  ['Attack of the Clones', 'Frank Oz', 'Yoda', voice],
  ['Revenge of the Sith', 'Ewan McGregor', 'Obi-Wan Kenobi', main],
  ['Revenge of the Sith', 'Hayden Christensen', 'Anakin Skywalker', main],
  ['Revenge of the Sith', 'Hayden Christensen', 'Darth Vader', supporting],
  ['Revenge of the Sith', 'James Earl Jones', 'Darth Vader', voice],
  ['Revenge of the Sith', 'Ian McDiarmid', 'Sheev Palpatine', supporting],
  ['A New Hope', 'Mark Hamill', 'Luke Skywalker', main],
  ['A New Hope', 'Carrie Fisher', 'Leia Organa', main],
  ['A New Hope', 'Harrison Ford', 'Han Solo', main],
  ['A New Hope', 'Peter Mayhew', 'Chewbacca', supporting],
  ['A New Hope', 'David Prowse', 'Darth Vader', supporting],
  ['A New Hope', 'James Earl Jones', 'Darth Vader', voice],
  ['A New Hope', 'Alec Guinness', 'Obi-Wan Kenobi', supporting],
  ['The Empire Strikes Back', 'Mark Hamill', 'Luke Skywalker', main],
  ['The Empire Strikes Back', 'Carrie Fisher', 'Leia Organa', main],
  ['The Empire Strikes Back', 'Harrison Ford', 'Han Solo', main],
  ['The Empire Strikes Back', 'Peter Mayhew', 'Chewbacca', supporting],
  ['The Empire Strikes Back', 'David Prowse', 'Darth Vader', supporting],
  ['The Empire Strikes Back', 'James Earl Jones', 'Darth Vader', voice],
  ['The Empire Strikes Back', 'Frank Oz', 'Yoda', voice],
  ['The Empire Strikes Back', 'Alec Guinness', 'Obi-Wan Kenobi', cameo],
  ['Return of the Jedi', 'Mark Hamill', 'Luke Skywalker', main],
  ['Return of the Jedi', 'Carrie Fisher', 'Leia Organa', main],
  ['Return of the Jedi', 'Harrison Ford', 'Han Solo', main],
  ['Return of the Jedi', 'Peter Mayhew', 'Chewbacca', supporting],
  ['Return of the Jedi', 'David Prowse', 'Darth Vader', supporting],
  ['Return of the Jedi', 'James Earl Jones', 'Darth Vader', voice],
  ['Return of the Jedi', 'Ian McDiarmid', 'Sheev Palpatine', supporting],
  ['Return of the Jedi', 'Frank Oz', 'Yoda', voice],
  ['The Force Awakens', 'Daisy Ridley', 'Rey', main],
  ['The Force Awakens', 'Adam Driver', 'Kylo Ren', main],
  ['The Force Awakens', 'Harrison Ford', 'Han Solo', main],
  ['The Force Awakens', 'Carrie Fisher', 'Leia Organa', supporting],
  ['The Force Awakens', 'Peter Mayhew', 'Chewbacca', supporting],
  ['The Force Awakens', 'Mark Hamill', 'Luke Skywalker', cameo],
  ['Rogue One', 'James Earl Jones', 'Darth Vader', voice],
];

/**
 * Popula uma organização de demonstração (`Jedi Archives`) com planetas, personagens, atores, filmes e elenco,
 * e imprime a credencial `admin` dela. Não roda duas vezes: se a organização já existir, só avisa.
 *
 * @example
 * pnpm migrate:seed 1_star_wars
 */
export default async function seed(db: Kysely<DB>) {
  const existing = await db
    .selectFrom('organization')
    .select('uuid')
    .where('document', '=', ORGANIZATION.document)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (existing) {
    console.warn(`⚠️  A organização ${ORGANIZATION.name} já existe (${existing.uuid}). Nada a fazer.`);
    return;
  }

  const organization = await OrganizationService.register(ORGANIZATION);
  const organization_uuid = organization.uuid;

  await db.transaction().execute(async (trx) => {
    /** Insere as linhas e devolve o mapa `nome → uuid`. */
    const insertAll = async <T extends 'planet' | 'character' | 'actor'>(table: T, rows: { name: string }[]) => {
      const inserted = await trx
        .insertInto(table)
        .values(rows.map((row) => ({ ...row, organization_uuid })) as never)
        .returning(['uuid', 'name'])
        .execute();
      return new Map(inserted.map((row) => [row.name, row.uuid]));
    };

    const planets = await insertAll(
      'planet',
      PLANETS.map((planet) => ({ ...planet }))
    );
    const characters = await insertAll(
      'character',
      CHARACTERS.map(({ planet, ...character }) => ({
        ...character,
        planet_uuid: planet ? planets.get(planet) : null,
      }))
    );
    const actors = await insertAll('actor', ACTORS);

    const filmRows = await trx
      .insertInto('film')
      .values(
        FILMS.map((film) => ({
          ...film,
          organization_uuid,
          category: film.episode ? eFilmCategory.skywalker_saga : eFilmCategory.anthology,
        }))
      )
      .returning(['uuid', 'title'])
      .execute();
    const films = new Map(filmRows.map((film) => [film.title, film.uuid]));

    await trx
      .insertInto('casting')
      .values(
        CASTING.map(([film, actor, character, role_type]) => ({
          organization_uuid,
          film_uuid: films.get(film)!,
          actor_uuid: actors.get(actor)!,
          character_uuid: characters.get(character)!,
          role_type,
        }))
      )
      .execute();
  });

  console.info(`\n🌌 ${ORGANIZATION.name} pronta: ${PLANETS.length} planetas, ${CHARACTERS.length} personagens,`);
  console.info(`   ${ACTORS.length} atores, ${FILMS.length} filmes e ${CASTING.length} participações.`);
  console.info('──────────────────────────────────────────────────────');
  console.info('Role:          admin');
  console.info(`Client ID:     ${organization.credentials.client_id}`);
  console.info(`Client Secret: ${organization.credentials.client_secret}`);
  console.info('──────────────────────────────────────────────────────');
  console.warn('⚠️  Guarde o Client Secret: ele não será exibido novamente. Que a Força esteja com você.\n');
}
