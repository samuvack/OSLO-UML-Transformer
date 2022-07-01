export interface GeneratorConfiguration {
  language: string;
  documentId: string;
  baseUri: string;
  shacl: {
    output: string;
  };
  jsonldContext: {
    output: string;
    addDomainPrefix: boolean;
  };
  translation: {
    output: string;
    language: string;
  };
  ldes: {
    connectorPackageName: string;
    databaseUrl: string;
  };
}
