<template>
  <InputRow v-for="(item, index) in controllerList" :key="item.id">
    <template v-slot:label>Image ({{ index + 1 }}):</template>
    <template v-slot:input>
      <ImageRow :index="index" @discard="discardImage" :imageController="item" :desiredRatio="desiredRatio" />
    </template>
  </InputRow>

  <InputRow v-if="controllerList.length < limit">
    <template v-slot:label>{{ title }}:</template>
    <template v-slot:input>
      <ImageDropZone v-on:addImage="addImage" />
    </template>
  </InputRow>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';

import { ImageEditorVariant, ControlledImage } from '../types/images';

import ImageRow from './ImageRow.vue';
import ImageDropZone from './ImageDropZone.vue';
import InputRow from './InputRow.vue';

export default defineComponent({
  name: 'ImageController',
  props: {
    multi: {
      type: Boolean,
      default: false,
    },
    limit: {
      type: Number,
      default: 1,
    },
    maxSize: {
      type: Number,
      default: 500 * 1024,
    },
    variant: {
      type: String as PropType<ImageEditorVariant>,
      default: 'RECTANGLE',
    },
    desiredRatio: {
      type: Number,
      default: 16 / 9,
    },
    title: {
      type: String,
      required: true,
    },
  },
  components: {
    ImageRow,
    ImageDropZone,
    InputRow,
  },
  setup(props) {
    const controllerList = ref<Array<ControlledImage>>([]);

    const addImage = (image: File) => {
      const controlledImage = new ControlledImage(image, props.desiredRatio);

      controllerList.value.push(controlledImage);
    };

    const discardImage = (id: number) => {
      controllerList.value = controllerList.value.filter((item) => item.id !== id);
    };

    return { addImage, controllerList, discardImage };
  },
});
</script>
