<template>
  <div class="flex mx-auto w-full h-full">
    <!-- submit button -->
    <button
      class="bg-primary hover:bg-primary-hover text-white font-bold shadow-xl uppercase text-lg mx-auto p-4 mt-4 rounded disabled:opacity-50 btn"
      @click="handleSubmit"
    >
      Click to trigger error
    </button>
  </div>
</template>

<script>
export default {
  name: "Sentry",
  created() {
    console.log("sentry");
  },
  methods: {
    async handleSubmit() {
      throw new Error("handleSubmit error");
    },
  },
};
</script>

<style lang="postcss">
.btn {
  border-bottom: outset;
}
.btn:active {
  border-bottom: unset;
}
</style>
