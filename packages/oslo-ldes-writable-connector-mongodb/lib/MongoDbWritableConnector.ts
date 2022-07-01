import type { LdesWritableConnector, OsloLdesMember } from '@oslo-flanders/core';
import { ns } from '@oslo-flanders/core';
import type * as RDF from '@rdfjs/types';
import type { Stream } from '@treecg/connector-types';
import { SimpleStream } from '@treecg/connector-types';
import { ingest } from '@treecg/sds-storage-writer-mongo';
import { MongoClient } from 'mongodb';
import { DataFactory } from 'rdf-data-factory';

interface MongoDbWritableConnectorConfig {
  databaseUrl: string;
}

type SR<T> = {
  [P in keyof T]: Stream<T[P]>;
};

interface Data {
  data: RDF.Quad[];
  metadata: RDF.Quad[];
}

export class MongoDbWritableConnector implements LdesWritableConnector<MongoDbWritableConnectorConfig> {
  private _client: MongoClient | undefined;
  private _dataStream: SimpleStream<RDF.Quad[]> | undefined;
  private _metadataStream: SimpleStream<RDF.Quad[]> | undefined;

  public async writeVersion(member: OsloLdesMember): Promise<void> {
    const collection = this.client.db('ldes').collection('version_identifiers');
    const filter = { id: member.id };
    const exists = await collection.findOne(filter) ?? null;

    if (!exists) {
      await collection.insertOne({
        id: member.id,
      });
      await this.dataStream.push(member.quads);
    }
  }

  public async init(config: MongoDbWritableConnectorConfig): Promise<void> {
    // FIXME: config is not correctly passed by generator
    this.client = new MongoClient(config.databaseUrl);
    await this.client.connect();

    this.dataStream = new SimpleStream<RDF.Quad[]>();
    this.metadataStream = new SimpleStream<RDF.Quad[]>();
    const streamReader: SR<Data> = { data: this.dataStream, metadata: this.metadataStream };

    await ingest(
      streamReader,
      'meta',
      'data',
      'index',
      'https://w3id.org/ldes#TimestampFragmentation',
      'mongodb://localhost:27017/ldes',
    );

    const factory = new DataFactory();

    // FIXME: add correct/production info
    await this.metadataStream.push(
      [
        factory.quad(
          ns.example('osloLdes'),
          ns.rdf('type'),
          factory.namedNode('https://w3id.org/sds#Stream'),
        ),
        factory.quad(
          ns.example('osloLdes'),
          factory.namedNode('https://w3id.org/sds#dataset'),
          ns.example('/id/dataset/1'),
        ),
        factory.quad(
          ns.example('/id/dataset/1'),
          ns.rdf('type'),
          ns.dcat('Dataset'),
        ),
        factory.quad(
          ns.example('/id/dataset/1'),
          factory.namedNode('https://w3id.org/ldes#timestampPath'),
          ns.dcterms('created'),
        ),
      ],
    );
  }

  public async stop(): Promise<void> {
    await Promise.all([
      this.client.close(),
      this.dataStream.end(),
      this.metadataStream.end(),
    ]);
  }

  public get client(): MongoClient {
    if (!this._client) {
      throw new Error(`MongoClient was not set yet.`);
    }
    return this._client;
  }

  public set client(value: MongoClient) {
    this._client = value;
  }

  public get dataStream(): SimpleStream<RDF.Quad[]> {
    if (!this._dataStream) {
      throw new Error('Data stream has not been set yet.');
    }
    return this._dataStream;
  }

  public set dataStream(value: SimpleStream<RDF.Quad[]>) {
    this._dataStream = value;
  }

  public get metadataStream(): SimpleStream<RDF.Quad[]> {
    if (!this._metadataStream) {
      throw new Error('Meta data stream has not been set yet.');
    }
    return this._metadataStream;
  }

  public set metadataStream(value: SimpleStream<RDF.Quad[]>) {
    this._metadataStream = value;
  }
}
