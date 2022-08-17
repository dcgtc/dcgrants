<template>
  <div v-if="txHash">
    <BaseHeader name="Create Grant : Transaction Status" />
    <TransactionStatus
      :hash="txHash"
      buttonLabel="CONTINUE"
      :buttonAction="() => (grantId ? pushRoute({ name: 'dgrants-submitted' }) : null)"
    />
  </div>

  <div v-else>
    <BaseHeader name="Setup Grant" />

    <form @submit.prevent="createGrant">
      <!-- Grant name -->
      <InputRow>
        <template v-slot:label>Title:</template>
        <template v-slot:input>
          <BaseInput
            v-model="form.name"
            width="w-full"
            placeholder="Grant name"
            id="grant-name"
            :rules="isDefined"
            errorMsg="Please enter a name"
          />
        </template>
      </InputRow>

      <!-- Owner address -->
      <InputRow text="has permission to edit the grant">
        <template v-slot:label>Owner address:</template>
        <template v-slot:input>
          <BaseInput
            v-model="form.owner"
            width="w-full"
            placeholder="owner ethereum address"
            id="owner-address"
            :rules="isValidAddress"
            errorMsg="Please enter a valid address"
          />
        </template>
      </InputRow>

      <!-- Payee address -->
      <InputRow text="address all contributions and matching funds are sent to">
        <template v-slot:label>Payee address:</template>
        <template v-slot:input>
          <BaseInput
            v-model="form.payee"
            width="w-full"
            placeholder="payee ethereum address"
            id="payee-address"
            :rules="isValidAddress"
            errorMsg="Please enter a valid address"
          />
        </template>
      </InputRow>

      <!-- Grant Description -->
      <InputRow>
        <template v-slot:label>Description:</template>
        <template v-slot:input>
          <BaseTextarea
            v-model="form.description"
            width="w-full"
            :placeholder="LOREM_IPSOM_TEXT"
            id="grant-description"
            :required="true"
            :rules="isDefined"
            errorMsg="Please enter a description"
          />
        </template>
      </InputRow>

      <!-- Grant website -->
      <InputRow>
        <template v-slot:label>Website:</template>
        <template v-slot:input>
          <BaseInput
            v-model="form.website"
            width="w-full"
            placeholder="https://"
            id="grant-website"
            :rules="isValidWebsite"
            errorMsg="Please enter a valid URL"
            :required="false"
          />
        </template>
      </InputRow>

      <!-- Grant github -->
      <InputRow>
        <template v-slot:label>Github:</template>
        <template v-slot:input>
          <BaseInput
            v-model="form.github"
            width="w-full"
            placeholder="https://"
            id="grant-github"
            :rules="isValidGithub"
            errorMsg="Please enter a valid Github URL"
            :required="false"
          />
        </template>
      </InputRow>

      <!-- Grant twitter handle -->
      <InputRow>
        <template v-slot:label>Twitter:</template>
        <template v-slot:input>
          <BaseInput
            v-model="form.twitter"
            width="w-full"
            placeholder="@twitterhandle"
            id="grant-handle"
            :rules="isValidTwitter"
            errorMsg="Please enter a valid Twitter handle"
            :required="false"
          />
        </template>
      </InputRow>

      <!-- Grant logo -->
      <InputRow>
        <template v-slot:label>Upload Logo:</template>
        <template v-slot:input>
          <BaseImageUpload
            v-model="form.logo"
            :logoURI="form.logoURI"
            width="w-full"
            id="grant-logo"
            :rules="isValidLogo"
            errorMsg="Logo must be in png, jpg, or svg format, under 512 kB, with dimensions of at least 500x500"
            :required="false"
            @update:modelValue="updateLogo"
            :isUploading="isUploadingLogo"
          />
        </template>
      </InputRow>

      <!-- Submit button -->
      <div class="px-4 md:px-12 py-12">
        <button
          type="submit"
          class="btn btn-primary ml-auto"
          :class="{ disabled: !isFormValid || !isCorrectNetwork }"
          :disabled="!isFormValid || !isCorrectNetwork"
        >
          Create Grant
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
// --- External Imports ---
import { computed, defineComponent, ref } from 'vue';
// --- Component Imports ---
import BaseHeader from 'src/components/BaseHeader.vue';
import InputRow from 'src/components/InputRow.vue';
import BaseInput from 'src/components/BaseInput.vue';
import BaseTextarea from 'src/components/BaseTextarea.vue';
import TransactionStatus from 'src/components/TransactionStatus.vue';
import BaseImageUpload from 'src/components/BaseImageUpload.vue';
// --- Store ---
import useWalletStore from 'src/store/wallet';
// --- Methods and Data ---
import { LOREM_IPSOM_TEXT, NO_LOGO_OBJECT } from 'src/utils/constants';
import { isValidAddress, isValidWebsite, isValidGithub, isValidTwitter, isDefined, pushRoute, urlFromTwitterHandle, isValidLogo, watchTransaction } from 'src/utils/utils'; // prettier-ignore
import * as ipfs from 'src/utils/data/ipfs';

function useNewGrant() {
  const { signer, grantRegistry, isCorrectNetwork } = useWalletStore();

  const txHash = ref<string>();
  const grantId = ref<string>();
  const isUploadingLogo = ref<boolean>(false);

  // Define form fields and parameters
  const form = ref<{
    owner: string;
    payee: string;
    name: string;
    description: string;
    website: string;
    github: string;
    twitter: string;
    logo: File | undefined;
    logoURI: string | undefined;
  }>({
    owner: '',
    payee: '',
    name: '',
    description: '',
    website: '',
    github: '',
    twitter: '',
    logo: undefined,
    logoURI: undefined,
  });

  const isLogoValid = ref(true);
  const isFormValid = computed(() => {
    return (
      isValidAddress(form.value.owner) &&
      isValidAddress(form.value.payee) &&
      isDefined(form.value.name) &&
      isDefined(form.value.description) &&
      isValidWebsite(form.value.website) &&
      isValidGithub(form.value.github) &&
      isValidTwitter(form.value.twitter) &&
      isLogoValid.value
    );
  });

  async function updateLogo(logo: File | undefined) {
    isLogoValid.value = await isValidLogo(logo);
    form.value.logo = logo && isLogoValid.value ? logo : undefined;
    if (isLogoValid.value) isUploadingLogo.value = true;
    try {
      form.value.logoURI = logo
        ? await ipfs.uploadFile(logo).then((cid) => ipfs.getMetaPtr({ cid: cid.toString() }))
        : '';
      isUploadingLogo.value = false;
    } catch (err) {
      isUploadingLogo.value = false;
      throw err;
    }
  }

  /**
   * @notice Creates a new grant, parses logs for the Grant ID, and navigates to that grant's page
   */
  async function createGrant() {
    // Send transaction
    const { owner, payee, name, description, website, github, twitter, logoURI } = form.value;
    const twitterURI = twitter === '' ? twitter : urlFromTwitterHandle(twitter);
    const properties = { websiteURI: website, githubURI: github, twitterURI };
    if (!signer.value) throw new Error('Please connect a wallet');
    if (!isCorrectNetwork.value) throw new Error('Wrong network');
    let cid = '';
    if (logoURI) {
      const splitLogoURI = (logoURI as string).split('/');
      cid = splitLogoURI[splitLogoURI.length - 1];
    }
    const logoPtr = cid ? ipfs.formatMetaPtr(cid) : NO_LOGO_OBJECT;
    const metaPtr = await ipfs
      .uploadGrantMetadata({ name, description, logoPtr, properties })
      .then((cid) => ipfs.formatMetaPtr(cid.toString()));

    // watch the transaction to check for any replacements/cancellations and update txHash accordingly
    const tx = await watchTransaction(() => grantRegistry.value.createGrant(owner, payee, metaPtr), txHash);
    // if the tx resolved...
    if (tx) {
      // Parse receipt to find the grant ID
      const receipt = await tx.wait();
      const log = grantRegistry.value.interface.parseLog(receipt.logs[0]); // there is only one emitted event
      // set the grantId
      grantId.value = log.args.id;
    }
  }

  return {
    updateLogo,
    createGrant,
    isValidAddress,
    isValidWebsite,
    isValidGithub,
    isValidTwitter,
    isValidLogo,
    isFormValid,
    isLogoValid,
    isDefined,
    isCorrectNetwork,
    form,
    LOREM_IPSOM_TEXT,
    txHash,
    grantId,
    pushRoute,
    isUploadingLogo,
  };
}

export default defineComponent({
  name: 'GrantRegistryNewGrant',
  components: {
    BaseHeader,
    BaseInput,
    BaseTextarea,
    InputRow,
    TransactionStatus,
    BaseImageUpload,
  },
  setup() {
    return { ...useNewGrant() };
  },
});
</script>
