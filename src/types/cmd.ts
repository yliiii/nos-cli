import { baseObjectParams } from './object'

export interface sdkConf {
  accessKey: string;
  accessSecret: string;
  endpoint: string;
  defaultBucket?: string;
  nosPath?: baseObjectParams;
}

export interface presetConf {
  [propName: string]: sdkConf;
}

export interface initInputParams {
  bucket: string;
  config: string;
  env: string;
  list: string;
  upload: string;
  normal: boolean
}

