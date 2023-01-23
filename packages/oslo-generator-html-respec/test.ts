import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import type * as RDF from '@rdfjs/types';
import * as nj from 'nunjucks';

import type { GeneratorConfiguration } from '@oslo-flanders/configuration';
import { ns } from '@oslo-flanders/core';

//Typescript file generates ReSpec HTML file

//Typescript file generates ReSpec HTML file
//The ReSpec HTML file is then used to generate the final HTML file
export class ReSpecGenerator extends Generator<GeneratorConfiguration> {
    private readonly logger = getLoggerFor(this);

    public constructor() {
        super();
    }

    public async generate(data: any): Promise<void> {
        const templateDir = resolve(`${__dirname}/../../respec`);
        nj.configure(templateDir, { autoescape: false });

        const html = nj.render(`templates/template-${this.configuration.targetLanguage}.njk`, { respec_config: this.getRespecConfig(), classes, page_title: this.configuration.title });
        writeFileSync('rendered-template.html', html);

        execSync(`npm --prefix ${__dirname}/../../ run generate-respec`);
    }

    private parseClasses(classQuads: RDF.Quad[]): any[] {
        return classQuads.map(classQuad => {
            const quads = this.store.getQuads(classQuad.subject, null, null, null);
            const labelQuad = quads.find(x => x.predicate.equals(ns.rdfs('label')));
            const definitionQuad = quads.find(x => x.predicate.equals(ns.rdfs('comment')));
            const usageNoteQuad = quads.find(x => x.predicate.equals(ns.vann('usageNote')));
            const parentQuad = quads.find(x => x.predicate.equals(ns.rdfs('subClassOf')));
            let parentLabel;

            if (parentQuad) {
                const parentLabelQuads = this.store.getQuads(parentQuad.subject, ns.rdfs('label'), null, null);
                if (parentLabelQuads.length > 0) {
                    parentLabel = parentLabelQuads[0].object.value;
                }
            }

            return {
                id: classQuad.subject.value,
                label: labelQuad?.object.value,
                definition: definitionQuad?.object.value,
                usageNote: usageNoteQuad?.object.value,
                parent: parentQuad?.object.value,
                parentLabel,
            };
        });
    }

    private getRespecConfig(): any { //https://respec.org/docs/#example-specifying-editors-and-authors
        const config = {
            specStatus: 'unofficial',
            editors: [
                {
                    name: 'Van Ackere, Samuel',
                    url: 'https://your-site.com',
                },
            ],
            github: 'w3c/respec',
            shortName: 'respec',
            xref: 'web-platform',
            group: 'webapps',
        };

        return `
      <script class="remove" >
        var respecConfig = ${JSON.stringify(config)}
      </script>
    `;
    }
}
