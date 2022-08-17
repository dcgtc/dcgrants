export interface Point {
  x: number;
  y: number;
}

export const findImageHeightBasedOnRatio = (container: HTMLDivElement, img: HTMLImageElement) => {
  return (img.height * container.offsetWidth) / img.width;
};

export const findImageWidthBasedOnRatio = (container: HTMLDivElement, img: HTMLImageElement) => {
  return (img.width * container.offsetHeight) / img.height;
};

export const findMoveMouseCursor = (container: HTMLElement) => (e: MouseEvent) => {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
};

export const findTouchCursor = (container: HTMLElement) => (e: TouchEvent) => {
  const rect = container.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;
  return { x, y };
};

export const diffPoints = (p1: Point, p2: Point) => {
  return { x: p2.x - p1.x, y: p2.y - p1.y };
};

export const getRatioDirection = (image: HTMLImageElement, desiredRatio: number) => {
  const ratio = image.width / image.height;
  const ratioDirection = ratio > desiredRatio ? true : false;
  return ratioDirection;
};

export const getImageUrlFromFile = (imageFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.readAsDataURL(imageFile);

    fr.onload = function () {
      const url = fr.result;
      if (!fr.result) return reject(new Error('File is not an image'));
      return resolve(String(url));
    };
  });
};

export const getRatio = (imageUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = String(imageUrl);

    image.onload = () => {
      return resolve(image.width / image.height);
    };
  });

  // Find URL from file reader
  // Create Image from url
};

export const dataURItoBlob = (dataURI: string) => {
  // convert base64/URLEncoded data component to raw binary data held in a string
  let byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0) byteString = atob(dataURI.split(',')[1]);
  else byteString = unescape(dataURI.split(',')[1]);

  // separate out the mime component
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to a typed array
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], { type: mimeString });
};
