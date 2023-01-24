import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import type * as RDF from '@rdfjs/types';
import * as nj from 'nunjucks';

import type { GeneratorConfiguration } from '@oslo-flanders/configuration';
import { ns } from '@oslo-flanders/core';

