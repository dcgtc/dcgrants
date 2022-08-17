import * as ipfs from 'src/utils/data/ipfs';
import { getRatio, getImageUrlFromFile } from 'src/utils/image-processing';

export enum ImageEditorVariant {
  rectangle = 'RECTANGLE',
  transparent = 'TRANSPARENT',
}

export interface ControlledImageField {
  raw: File;
  processed: File | undefined;
  thumbnail: File | undefined;
}

export interface ControlledIPFSHashes {
  raw: string | undefined;
  processed: string | undefined;
  thumbnail: string | undefined;
}

export class ControlledImage extends EventTarget {
  isUploading: boolean;
  images: ControlledImageField;
  hashes: ControlledIPFSHashes;
  needEdit: boolean;
  desiredRatio: number;
  id: number;

  constructor(rawImage: File, desiredRatio: number) {
    super();
    this.id = Math.floor(Math.random() * 10000);
    this.isUploading = false;
    this.needEdit = false;
    this.desiredRatio = desiredRatio;
    this.images = {
      raw: rawImage,
      processed: undefined,
      thumbnail: undefined,
    };
    this.hashes = {
      raw: undefined,
      processed: undefined,
      thumbnail: undefined,
    };
    this.uploadRaw();
    this.process();
  }

  uploadRaw() {
    this.isUploading = true;
    this.dispatchEvent(new Event('changed'));
    ipfs
      .uploadFile(this.images.raw)
      .then((cid) => {
        this.isUploading = false;
        this.hashes.raw = cid.toString();
        this.dispatchEvent(new Event('changed'));
      })
      .catch((err) => {
        // TODO need to add proper error handling
        console.log(err);
      });
  }

  process(targetImage?: File) {
    const target = targetImage ? targetImage : this.images.raw;
    getImageUrlFromFile(target)
      .then((url) => getRatio(url))
      .then((rat) => {
        if (this.desiredRatio.toFixed(1) !== rat.toFixed(1)) {
          this.needEdit = true;
          this.dispatchEvent(new Event('changed'));
        } else {
          this.needEdit = false;
          // TODO we still need to manage image size
          // TODO also need to manage thumbnail
          this.images.processed = target;
          this.isUploading = true;
          this.dispatchEvent(new Event('changed'));

          ipfs
            .uploadFile(target)
            .then((cid) => {
              this.isUploading = false;
              this.hashes.processed = cid.toString();
              this.dispatchEvent(new Event('changed'));
            })
            .catch((err) => {
              // TODO need to add proper error handling
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
