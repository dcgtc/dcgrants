<template>
  <div>
    <BaseHeader name="Image Uploader : Show Case" />

    <ImageController :ratio="16 / 9" title="Something Title" limit="5" />
  </div>
</template>

<script lang="ts">
// --- External Imports ---
import { defineComponent } from 'vue';
// --- Component Imports ---
import BaseHeader from 'src/components/BaseHeader.vue';

import ImageController from 'src/components/ImageController.vue';

export default defineComponent({
  name: 'ImageUploaderShowCase',
  components: {
    BaseHeader,
    ImageController,
  },
  setup() {
    return {};
  },
});
</script>
