<template>
  <div v-if="needEdit || isEdit">
    <!-- We should put editor here -->
    <ImageEditor
      :imageName="imageController.images.raw.name"
      @cropped="onCrop"
      @cancel="cancelEdit"
      @discard="discard"
      :desiredRatio="desiredRatio"
      :selectedImage="selectedImage"
      :imageId="imageController.id"
      :isEdit="isEdit"
    />
  </div>
  <div v-if="!needEdit && !isEdit">
    <!--We should put finalized editor here  -->
    <div class="flex items-center" v-if="isUploading">
      <div class="flex items-center">
        <div class="inline-block">
          <img :src="thumbImage" class="w-40 opacity-30" />
        </div>
        <div class="m-8 inline-block">Uploading - {{ imageController.images.raw.name }}</div>
      </div>
      <div class="flex items-center">
        <button v-on:click="discard">Delete</button>
      </div>
    </div>
    <div v-if="!isUploading" class="flex">
      <div class="flex items-center">
        <div class="inline-block">
          <img :src="thumbImage" class="w-40" />
        </div>
        <div class="m-8 inline-block">
          {{ imageController.images.raw.name }}
        </div>
      </div>
      <div class="flex items-center">
        <button v-on:click="changeEdit">Edit</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import ImageEditor from './ImageEditor.vue';
import { ControlledImage } from '../types/images';

import { getImageUrlFromFile } from '../utils/image-processing';

export default defineComponent({
  name: 'ImageRow',
  components: {
    ImageEditor,
  },
  props: {
    imageController: {
      type: Object as PropType<ControlledImage>,
      required: true,
    },
    desiredRatio: {
      type: Number,
    },
    index: {
      type: Number,
    },
  },
  setup(props, context) {
    const isUploading = ref<boolean>(props.imageController.isUploading);
    const needEdit = ref<boolean>(props.imageController.needEdit);
    const selectedImage = ref<any>('');
    const isEdit = ref<boolean>(false);
    const thumbImage = ref<string | null>('');

    props.imageController?.addEventListener('changed', async () => {
      const { imageController } = props;
      isUploading.value = imageController.isUploading;
      needEdit.value = imageController.needEdit;
      getImageUrlFromFile(imageController.images.raw)
        .then((imageUrl) => {
          selectedImage.value = imageUrl;
        })
        .catch((err) => console.log(err));

      if (imageController.images.processed) {
        getImageUrlFromFile(imageController.images.processed)
          .then((imageUrl) => {
            thumbImage.value = imageUrl;
          })
          .catch((err) => console.log(err));
      }
    });

    const onCrop = (image: File) => {
      props.imageController.process(image);
    };

    /* const processProperRatioImage = () => {
      imageController.process();
    };
*/
    const discard = () => {
      const { imageController } = props;
      context.emit('discard', imageController.id);
    };

    const changeEdit = () => {
      isEdit.value = !isEdit.value;
    };

    const cancelEdit = () => {
      isEdit.value = false;
    };

    return {
      isUploading,
      needEdit,
      selectedImage,
      discard,
      onCrop,
      isEdit,
      thumbImage,
      changeEdit,
      cancelEdit,
    };
  },
});
</script>
