<template>
  <div
    :id="`image-container@${imageId}`"
    :class="`relative border overflow-hidden border-current ${isGrabbing ? 'cursor-move' : ''}`"
    :style="`width: 640px; height: ${640 / desiredRatio}px`"
  >
    <img :id="`selected-image@${imageId}`" :src="selectedImage" class="max-w-none absolute" />
  </div>
  <hr />
  <button type="button" @click="draw">Crop</button>
  <button class="mx-8" type="button" @click="discard">Discard</button>
  <button class="mx-8" type="button" @click="cancel">Cancel</button>
  <button class="mx-8" type="button" @click="zoomIn">Zoom In</button>
  <div>Zoom Ratio: {{ zoomRatio.toFixed(1) }}x</div>
  <button class="mx-8" type="button" @click="zoomOut">Zoom Out</button>
  <div :id="`canvas-container@${imageId}`"></div>
</template>

<script lang="ts">
import { defineComponent, watch, ref } from 'vue';

import {
  findImageHeightBasedOnRatio,
  findImageWidthBasedOnRatio,
  Point,
  findMoveMouseCursor,
  getRatioDirection,
  diffPoints,
  dataURItoBlob,
  findTouchCursor,
} from '../utils/image-processing';

export default defineComponent({
  name: 'ImageEditor',

  props: {
    selectedImage: {
      type: String,
      required: true,
    },
    desiredRatio: {
      type: Number,
      default: 16 / 9,
    },
    mimeType: {
      type: String,
    },
    imageId: {
      type: Number,
      default: 0,
    },
    imageName: {
      type: String,
      default: 'none',
    },
    isEdit: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, context) {
    const isGrabbing = ref(false);
    const zoomRatio = ref(1);

    const initialRender = async () => (
      setTimeout(() => {
        // TODO need to implement a more flexible ratio selection for the component
        // Currently it only works with 1920 x 1080 - 16 x 9
        const { mimeType } = props;

        var container = <HTMLDivElement>document.getElementById(`image-container@${props.imageId}`);
        var c = <HTMLImageElement>document.getElementById(`selected-image@${props.imageId}`);

        var image = new Image();
        image.src = props.selectedImage;

        // var isGrabbing = false;
        var grabbinStartPoints = <null | Point>null;
        var lastMovePoint = <null | Point>null;

        image.onload = () => {
          const ratioDirection = getRatioDirection(image, props.desiredRatio);

          // Initial Size of the image based on it's ratio it will fit by its width or height

          if (ratioDirection) {
            c.style.width = 'auto';
            c.style.height = `${container.offsetHeight}px`;
          } else {
            c.style.height = 'unset';
            c.width = container.offsetWidth;
          }

          if (ratioDirection) {
            const relativeWidth = findImageWidthBasedOnRatio(container, image);
            c.style.left = `${(container.offsetWidth - relativeWidth) / 2}px`;
          } else {
            const relativeHeight = findImageHeightBasedOnRatio(container, image);
            c.style.top = `${(container.offsetHeight - relativeHeight) / 2}px`;
          }
        };
        //  const findMouseCursor = findMoveMouseCursor(container);

        c.addEventListener('mousedown', (e) => {
          e.preventDefault();
          isGrabbing.value = true;
          grabbinStartPoints = findMoveMouseCursor(container)(e);
        });

        c.addEventListener('mouseup', () => {
          if (isGrabbing.value) {
            isGrabbing.value = false;
            grabbinStartPoints = null;
          }
        });

        c.addEventListener('touchstart', (e) => {
          e.preventDefault();
          isGrabbing.value = true;
          grabbinStartPoints = findTouchCursor(container)(e);
        });

        c.addEventListener('touchend', () => {
          if (isGrabbing.value) {
            isGrabbing.value = false;
            grabbinStartPoints = null;
          }
        });

        const relativeMover = (image: HTMLImageElement, container: HTMLDivElement) => (diff: Point) => {
          const containerHeight = container.offsetHeight;

          const containerWidth = container.offsetWidth;

          const computedOffsetLeft = image.offsetLeft - diff.x;
          const computedOffsetTop = image.offsetTop - diff.y;
          const computedOffsetRight = -1 * (image.width - containerWidth + computedOffsetLeft);
          const computedOffsetBottom = -1 * (image.height - containerHeight + computedOffsetTop);

          if ((computedOffsetLeft < 0 && computedOffsetRight < 0) || mimeType === 'image/png') {
            c.style.left = `${computedOffsetLeft}px`;
          } else if (computedOffsetLeft >= 0) {
            c.style.left = `${0}px`;
          } else {
            c.style.left = `${containerWidth - image.width}px`;
          }

          if ((computedOffsetTop < 0 && computedOffsetBottom < 0) || mimeType === 'image/png') {
            c.style.top = `${computedOffsetTop}px`;
          } else if (computedOffsetTop >= 0) {
            c.style.top = `${0}px`;
          } else {
            c.style.top = `${containerHeight - image.height}px`;
          }
        };

        c.addEventListener('mousemove', (e) => {
          e.preventDefault();

          if (isGrabbing.value && grabbinStartPoints) {
            if (lastMovePoint) {
              const relativeCursor = findMoveMouseCursor(c)(e);
              const diff = diffPoints(relativeCursor, lastMovePoint);

              relativeMover(c, container)(diff);
            }
          }
          lastMovePoint = findMoveMouseCursor(c)(e);
        });

        c.addEventListener('touchmove', (e) => {
          e.preventDefault();

          if (isGrabbing.value && grabbinStartPoints) {
            if (lastMovePoint) {
              const relativeCursor = findTouchCursor(c)(e);
              const diff = diffPoints(relativeCursor, lastMovePoint);

              relativeMover(c, container)(diff);
            }
          }
          lastMovePoint = findTouchCursor(c)(e);
        });

        c.addEventListener('mouseout', () => {
          if (isGrabbing.value) {
            isGrabbing.value = false;
            grabbinStartPoints = null;
          }
        });

        c.addEventListener('touchcancel', () => {
          if (isGrabbing.value) {
            isGrabbing.value = false;
            grabbinStartPoints = null;
          }
        });

        const relativeRenderer =
          (source: HTMLImageElement, image: HTMLImageElement, container: HTMLDivElement, desiredRatio: number) =>
          (center: Point | null, insideWidth: number, insideHeight: number) => {
            const ratioDirection = getRatioDirection(source, desiredRatio);

            //   const ImageHeight = image.height;
            //   const containerHeight = container.offsetHeight;
            const ImageHeight = image.height;
            const containerHeight = container.offsetHeight;

            const ImageWidth = image.width;
            const containerWidth = container.offsetWidth;
            if (ratioDirection) {
              if ((containerHeight / insideHeight) * ImageHeight <= containerHeight && mimeType !== 'image/png') {
                image.style.height = `${containerHeight}px`;
              } else {
                image.style.height = `${(containerHeight / insideHeight) * ImageHeight}px`;
              }
            } else {
              if ((containerWidth / insideWidth) * ImageWidth <= containerWidth && mimeType !== 'image/png') {
                image.style.width = `${containerWidth}px`;
              } else {
                image.style.width = `${(containerWidth / insideWidth) * ImageWidth}px`;
              }
            }

            const relativeRatio = image.width / ImageWidth;

            if (center) {
              const computedOffsetLeft = -1 * (center.x * relativeRatio - containerWidth / 2);
              const computedOffsetTop = -1 * (center.y * relativeRatio - containerHeight / 2);
              const computedOffsetRight = -1 * (image.width - containerWidth + computedOffsetLeft);
              const computedOffsetBottom = -1 * (image.height - containerHeight + computedOffsetTop);

              if ((computedOffsetLeft < 0 && computedOffsetRight < 0) || mimeType === 'image/png') {
                c.style.left = `${computedOffsetLeft}px`;
              } else if (computedOffsetLeft >= 0) {
                c.style.left = `${0}px`;
              } else {
                c.style.left = `${containerWidth - image.width}px`;
              }

              if ((computedOffsetTop < 0 && computedOffsetBottom < 0) || mimeType === 'image/png') {
                c.style.top = `${computedOffsetTop}px`;
              } else if (computedOffsetTop >= 0) {
                c.style.top = `${0}px`;
              } else {
                c.style.top = `${containerHeight - image.height}px`;
              }
            } else {
              const center = {
                x: -1 * c.offsetLeft + containerWidth / 2,
                y: -1 * c.offsetTop + containerHeight / 2,
              };
              const computedOffsetLeft = -1 * (center.x * relativeRatio - containerWidth / 2);
              const computedOffsetTop = -1 * (center.y * relativeRatio - containerHeight / 2);
              const computedOffsetRight = -1 * (image.width - containerWidth + computedOffsetLeft);
              const computedOffsetBottom = -1 * (image.height - containerHeight + computedOffsetTop);

              if ((computedOffsetLeft < 0 && computedOffsetRight < 0) || mimeType === 'image/png') {
                c.style.left = `${computedOffsetLeft}px`;
              } else if (computedOffsetLeft >= 0) {
                c.style.left = `${0}px`;
              } else {
                c.style.left = `${containerWidth - image.width}px`;
              }

              if ((computedOffsetTop < 0 && computedOffsetBottom < 0) || mimeType === 'image/png') {
                c.style.top = `${computedOffsetTop}px`;
              } else if (computedOffsetTop >= 0) {
                c.style.top = `${0}px`;
              } else {
                c.style.top = `${containerHeight - image.height}px`;
              }
            }
          };

        container.addEventListener('zoom-in', () => {
          if (zoomRatio.value < 4) {
            relativeRenderer(
              image,
              c,
              container,
              props.desiredRatio
            )(null, container.offsetWidth * 0.75, container.offsetHeight * 0.75);
          }
          zoomRatio.value = c.width / image.width;
        });

        container.addEventListener('zoom-out', () => {
          relativeRenderer(
            image,
            c,
            container,
            props.desiredRatio
          )(null, container.offsetWidth / 0.75, container.offsetHeight / 0.75);
          zoomRatio.value = c.width / image.width;
        });

        container.addEventListener('wheel', (e) => {
          // TODO
          // FEATURE : Must add something to zoom around cursor

          e.preventDefault();
          const isZoomIn = e.deltaY < 0;

          const relativeCursor = findMoveMouseCursor(c)(e);

          if (isZoomIn && zoomRatio.value < 4) {
            relativeRenderer(
              image,
              c,
              container,
              props.desiredRatio
            )(
              { x: relativeCursor.x, y: relativeCursor.y },
              container.offsetWidth * 0.75,
              container.offsetHeight * 0.75
            );
          } else {
            relativeRenderer(
              image,
              c,
              container,
              props.desiredRatio
            )(
              { x: relativeCursor.x, y: relativeCursor.y },
              container.offsetWidth / 0.75,
              container.offsetHeight / 0.75
            );
          }
          zoomRatio.value = c.width / image.width;
        });
      }),
      100
    );

    initialRender();

    watch(() => props.selectedImage, initialRender);

    const zoomIn = () => {
      var container = <HTMLDivElement>document.getElementById(`image-container@${props.imageId}`);

      const zoomInEvent = new CustomEvent('zoom-in');
      container.dispatchEvent(zoomInEvent);
    };

    const zoomOut = () => {
      var container = <HTMLDivElement>document.getElementById(`image-container@${props.imageId}`);

      const zoomInEvent = new CustomEvent('zoom-out');
      container.dispatchEvent(zoomInEvent);
    };

    const draw = () => {
      const findUnRelativeOffsets = (source: HTMLImageElement, image: HTMLImageElement) => {
        const relativeRatio = image.width / source.width;
        return {
          top: image.offsetTop / relativeRatio,
          left: image.offsetLeft / relativeRatio,
        };
      };

      var existedCanvas = <HTMLCanvasElement>document.getElementById('imagemask');
      var container = <HTMLDivElement>document.getElementById(`image-container@${props.imageId}`);
      var canvasContainer = <HTMLDivElement>document.getElementById(`canvas-container@${props.imageId}`);
      if (existedCanvas) {
        canvasContainer.removeChild(existedCanvas);
      }
      var c = <HTMLImageElement>document.getElementById(`selected-image@${props.imageId}`);
      var image = new Image();
      image.src = props.selectedImage;
      image.onload = () => {
        var canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.border = '1px solid';

        const unrelativeOffset = findUnRelativeOffsets(image, c);

        const offsetLeft = unrelativeOffset.left;
        const offsetTop = unrelativeOffset.top;

        const ratio = image.width / image.height;
        const ratioDirection = ratio > props.desiredRatio ? true : false;

        if (ratioDirection) {
          const zoomRatio = container.offsetHeight / c.height;
          canvas.width = image.height * props.desiredRatio * zoomRatio;
          canvas.height = image.height * zoomRatio;
        } else {
          const zoomRatio = container.offsetWidth / c.width;
          canvas.width = image.width * zoomRatio;
          canvas.height = (image.width / props.desiredRatio) * zoomRatio;
        }

        canvas.id = `imagemask@${props.imageId}`;
        canvas.style.display = 'none';
        canvasContainer.appendChild(canvas);
        {
          var ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(image, 0, 0, image.width, image.height, offsetLeft, offsetTop, image.width, image.height);

            var img = canvas.toDataURL('image/jpeg', 1);
            const croppedFile = new File([dataURItoBlob(img)], props.imageName);
            context.emit('cropped', croppedFile);
          }
        }
      };
    };

    const discard = () => {
      context.emit('discard');
    };

    const cancel = () => {
      context.emit('cancel');
    };

    return { draw, isGrabbing, discard, zoomIn, zoomOut, zoomRatio, cancel };
  },
});
</script>
