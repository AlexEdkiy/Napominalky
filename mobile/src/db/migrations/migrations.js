// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_black_sunset_bain.sql';
import m0001 from './0001_sparkling_omega_red.sql';
import m0002 from './0002_bent_purifiers.sql';
import m0003 from './0003_freezing_doctor_spectrum.sql';
import m0004 from './0004_notes_color.sql';
import m0005 from './0005_lists_type_quantity_deadline.sql';
import m0006 from './0006_lists_item_meta.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006
    }
  }
