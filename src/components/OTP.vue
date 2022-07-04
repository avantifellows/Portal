<template>
  <!-- loading spinner -->
  <div v-if="isLoading" class="h-full w-full fixed z-50">
    <div class="flex mx-auto w-full h-full">
      <inline-svg
        class="text-black text-4xl m-auto animate-spin h-20 w-20"
        :src="require('@/assets/images/loading_spinner.svg')"
      ></inline-svg>
    </div>
  </div>

  <!-- main div -->
  <div
    class="flex flex-col my-auto h-full py-32 space-y-6"
    :class="{ 'opacity-20 pointer-events-none': isLoading }"
  >
    <!-- title -->
    <p
      class="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl mx-auto font-bold px-6"
    >
      {{ inputBoxDisplayTitle }}
    </p>

    <!--text box to enter phone number-->
    <div
      v-for="(phoneNumberObject, index) in phoneNumberList"
      :key="`idInput-${index}`"
      class="flex flex-row justify-center"
    >
      <input
        v-model="phoneNumberObject.userID"
        :type="inputType"
        :inputmode="inputMode"
        pattern="[0-9]*"
        :placeholder="inputBoxPlaceholderText"
        required
        class="border-2 rounded-sm p-4 mx-auto border-gray-500 focus:border-gray-800 focus:outline-none"
        :class="selectInputBoxClasses"
        :disabled="isPhoneNumberNotEditable"
        @keypress="isValidPhoneNumber($event)"
        @input="updatePhoneNumber($event)"
      />
    </div>

    <!-- invalid input message  -->
    <span
      v-if="isInvalidPhoneNumberMessageShown"
      class="mx-auto text-red-700 text-base mb-1 px-2"
      >{{ invalidPhoneNumberMessage }}</span
    >

    <!--text box to enter OTP-->
    <div v-if="isOTPSent" class="flex flex-col justify-center">
      <p
        class="text-md sm:text-l md:text-l lg:text-xl xl:text-2xl mx-auto font-bold px-6"
      >
        {{ enterOTPInputBoxDisplayText }}
      </p>
      <input
        v-model="OTPCode"
        class="border-2 rounded-sm p-4 mx-auto border-gray-500 focus:border-gray-800 focus:outline-none"
      />
    </div>

    <!-- button to request for OTP -->
    <button
      v-show="!isOTPSent"
      class="bg-primary hover:bg-primary-hover text-white uppercase text-lg mx-auto p-4 mt-4 disabled:opacity-50"
      :disabled="isRequestOTPButtonDisabled"
      @click="sendOTP"
    >
      {{ requestOTPButtonDisplayText }}
    </button>

    <!-- button to resend OTP -->
    <button
      v-show="isCountdownFinished"
      class="bg-primary hover:bg-primary-hover text-white uppercase text-lg mx-auto p-4 mt-4 disabled:opacity-50"
      @click="sendOTP"
    >
      {{ resendOTPButtonText }}
    </button>

    <!-- OTP response message  -->
    <span v-show="isOTPMessageDisplayed" :class="displayOTPMessageClass">{{
      OTPResponseMessage
    }}</span>

    <!-- timer for resending OTP -->
    <p v-show="hasCountdownStarted" class="mx-auto font-bold px-6">
      {{ resendOTPText }}
      {{ formattedResendTimer }}
    </p>

    <!-- submit button -->
    <button
      v-show="isOTPSent"
      class="bg-primary hover:bg-primary-hover text-white font-bold shadow-xl uppercase text-lg mx-auto p-4 mt-4 rounded disabled:opacity-50 btn"
      :disabled="isSubmitButtonDisabled"
      @click="verifyOTP"
    >
      {{ submitButtonDisplayText }}
    </button>
  </div>
</template>

<script>
import { validateID } from "@/services/validation.js";
import { redirectToDestination } from "@/services/redirectToDestination.js";
import { sendSQSMessage } from "@/services/API/sqs";
import { validationTypeToFunctionMap } from "@/services/basicValidationMapping.js";
import OTPAuth from "@/services/API/otp";
import {
  mapVerifyStatusCodeToMessage,
  mapSendStatusCodeToMessage,
} from "@/services/OTPCodes.js";
import { mapState, mapActions } from "vuex";
const RESEND_OTP_TIME_OUT = 60;

export default {
  name: "OTP",
  props: {
    redirectTo: String,
    redirectID: String,
    purpose: String,
    purposeParams: String,
    groupData: Object,
    group: String,
    authType: String,
  },
  data() {
    return {
      phoneNumberList: [{ userID: "", valid: false }], // contains the phone number entered by the user
      isUserValid: false, // whether the user exists in our database
      isOTPSent: false, // has the OTP been sent
      OTPCode: "", // string that contains the OTP code entered by the user
      isLoading: false,
      displayOTPMessage: [{ message: "", status: "" }], // string that contains any messages returned by the OTP service
      invalidPhoneNumberMessage: null, // whether the input being entered by the user matches a phone number format
      isOTPResendButtonShown: false, // whether OTP resend button should be shown
      resendOTPTimeLimit: RESEND_OTP_TIME_OUT, // time in seconds after which the resend OTP button should be displayed
      OTPInterval: null, // to store the interval instance of the countdown timer
      userType: "", // differentiates between different kinds of users
    };
  },

  computed: {
    ...mapState({
      /** Retrieve phone number stored in vuex */
      storePhoneNumber: (state) => state.phoneNumber,
    }),

    /** Extracts phone number from list */
    phoneNumber() {
      return this.phoneNumberList[0]["userID"];
    },

    /** Returns the input mode stored against the group */
    inputMode() {
      return this.groupData.input.mode;
    },

    /** Returns the input type stored against the group */
    inputType() {
      return this.groupData.input.type;
    },

    /** Returns the placeholder text, stored against the group, for the phone number input box. */
    inputBoxPlaceholderText() {
      return this.groupData.text.default.placeholder;
    },

    /** Checks if any phoneNumber has been entered */
    isAnyPhoneNumberPresent() {
      return this.phoneNumberList != undefined && this.phoneNumber != "";
    },

    /** Whether the 'Request OTP' button should be disabled */
    isRequestOTPButtonDisabled() {
      return (
        this.phoneNumber == undefined ||
        this.invalidPhoneNumberMessage != "" ||
        this.isOTPSent == true
      );
    },

    /**
     * Whether the submit button is disabled
     * Returns true if OTP hasn't been typed yet
     */
    isSubmitButtonDisabled() {
      return this.OTPCode.length === 0;
    },

    /** Checks if the current input entry has the required number of characters */
    isCurrentEntryIncomplete() {
      return this.phoneNumber.length < this.maxLengthOfPhoneNumber;
    },

    /** Whether input being typed is in the correct format */
    isInvalidPhoneNumberMessageShown() {
      return this.invalidPhoneNumberMessage != null;
    },

    /** Returns the heading text for the input box */
    inputBoxDisplayTitle() {
      return this.groupData.text.default.display;
    },

    /** Returns the title text for the OTP code input box */
    enterOTPInputBoxDisplayText() {
      return this.groupData.text.default.enterOTP;
    },

    /** Returns the text for the Request OTP button */
    requestOTPButtonDisplayText() {
      return this.groupData.text.default.requestOTP;
    },

    /** Returns the text for the submit button */
    submitButtonDisplayText() {
      return this.groupData.text.default.submitButton;
    },

    /** Returns the maximum length of the ID */
    maxLengthOfPhoneNumber() {
      return this.groupData.input.maxLengthOfId;
    },

    /** Returns the basic validation type for the input */
    basicValidationType() {
      return this.groupData.input.basicValidationType;
    },

    /** Returns the invalid input message stored against each group */
    invalidPhoneNumberMessageFromDatabase() {
      return this.groupData.text.default.invalid.input;
    },

    /**
     * Whether to display the OTP response message.
     * It will not be displayed if the resend OTP timer is finished and will be replaced by the resend OTP button
     */
    isOTPMessageDisplayed() {
      if (this.resendOTPTimeLimit === 0) {
        return false;
      }
      return true;
    },

    /** Extracts message returned from OTP service*/
    OTPResponseMessage() {
      return this.displayOTPMessage["message"];
    },

    /** Determines how the OTP message should look like.
     * - If the message is returned with a failure status, the text is red
     * - Otherwise, the text is green
     */
    displayOTPMessageClass() {
      let baseStyle = "mx-auto text-base mb-1 px-6";
      return this.displayOTPMessage["status"] === "failure"
        ? baseStyle + " text-red-700"
        : baseStyle + " text-green-700";
    },

    /** Whether the timer is done */
    isCountdownFinished() {
      return this.resendOTPTimeLimit === 0;
    },

    /** When to start the timer */
    hasCountdownStarted() {
      return this.resendOTPTimeLimit !== 0 && this.isOTPSent;
    },

    /** Returns text for resend OTP button */
    resendOTPButtonText() {
      return this.groupData.text.default.resendOTPButton;
    },

    /** Returns text for resend OTP title */
    resendOTPText() {
      return this.groupData.text.default.resendOTPText;
    },

    /** Format for the timer */
    formattedResendTimer() {
      const minutes = Math.floor(this.resendOTPTimeLimit / 60);
      let seconds = this.resendOTPTimeLimit % 60;
      if (seconds < 10) {
        seconds = `0${seconds}`;
      }
      return `${minutes}:${seconds}`;
    },

    /** Whether the user can change the phone number.
     * The user can't change the input
     * if the OTP has been sent and if the resend button timer hasn't started
     */
    isPhoneNumberNotEditable() {
      return this.isOTPSent && this.hasCountdownStarted;
    },
  },
  watch: {
    /** Watches for the timer to finish */
    resendOTPTimer() {
      if (this.resendOTPTimer === 0) {
        clearInterval(this.interval);
      }
    },
  },
  created() {
    /** The user type is set as soon as component is created */
    this.userType = this.groupData.userType;
  },
  mounted() {
    /** If user already logged in, get from store and redirect to destination */
    if (this.storePhoneNumber) {
      this.phoneNumberList[0]["userID"] = this.storePhoneNumber;
      this.authenticateAndRedirect();
    }
  },
  methods: {
    ...mapActions(["setPhoneNumber"]),
    /** Determines how the input box should look.
     * - If an input error needs to be displayed, the box has a a red border.
     * - Otherwise, it has an opacity of 30.
     */
    selectInputBoxClasses() {
      let baseStyle =
        "border-2 rounded-sm p-4 mx-auto border-gray-500 focus:border-gray-800 focus:outline-none";
      return this.invalidPhoneNumberMessage
        ? baseStyle + "border-red-600 focus:border-red-600"
        : baseStyle + "pointer-events-none opacity-30";
    },

    /** Starts the timer */
    startTimer() {
      this.OTPInterval = setInterval(() => (this.resendOTPTimeLimit -= 1), 1000);
    },

    /** Calls the mapping function to validate the typed character
     * @param {Object} event - event triggered when a character is typed
     */
    isValidPhoneNumber(event) {
      if (validationTypeToFunctionMap[this.basicValidationType](event)) {
        return true;
      } else event.preventDefault();
    },

    /** Resets the invalid phone number message */
    resetinvalidPhoneNumberMessage() {
      this.invalidPhoneNumberMessage = "";
    },

    /** This function is called whenever something is entered in the input box.
     * It checks if the required number of characters are being typed.
     * @param {Object} event - the event which triggered this function
     */
    updatePhoneNumber(event) {
      if (event.target.value.length == 0) {
        this.invalidPhoneNumberMessage = "";
      } else if (event.target.value.length > this.maxLengthOfPhoneNumber) {
        event.target.value = event.target.value.slice(0, this.maxLengthOfPhoneNumber);
        this.phoneNumberList[0]["userID"] = event.target.value.toString();
      } else if (event.target.value.length < this.maxLengthOfPhoneNumber) {
        this.invalidPhoneNumberMessage = this.invalidPhoneNumberMessageFromDatabase;
      } else {
        this.resetinvalidPhoneNumberMessage();
      }
    },

    /** Function that calls the API to send an OTP
     * If the status is 200, the OTP has been sent.
     * Otherwise, retry
     */
    async sendOTP() {
      const response = await OTPAuth.sendOTP(parseInt(this.phoneNumber));
      let responseStatusCodeAndMessage = response.data.split("|");
      const responseStatusMessage = responseStatusCodeAndMessage[0];
      this.displayOTPMessage = mapSendStatusCodeToMessage(responseStatusMessage.trim());
      this.displayOTPMessage["status"] === "success"
        ? (this.isOTPSent = true)
        : (this.isOTPSent = false);
      this.resendOTPTimeLimit = RESEND_OTP_TIME_OUT;
      if (this.isOTPSent) {
        this.startTimer();
      }
    },

    /** Function that verifies the OTP */
    async verifyOTP() {
      const response = await OTPAuth.verifyOTP(parseInt(this.phoneNumber), this.OTPCode);
      let responseStatusCodeAndMessage = response.data.split("|");
      const responseStatusMessage = responseStatusCodeAndMessage[0];
      const responseStatusCode = responseStatusCodeAndMessage[1];
      if (responseStatusMessage.trim() === "success") {
        this.isLoading = true;
        this.setPhoneNumber(this.phoneNumber);
        this.authenticateAndRedirect();
      } else {
        this.displayOTPMessage =
          mapVerifyStatusCodeToMessage[responseStatusCode.trim().toString()];
      }
    },

    /** This method authenticates the phone number.
     */
    async authenticatePhoneNumber() {
      this.isLoading = true;
      this.phoneNumberList[0]["valid"] = await validateID(
        this.phoneNumber,
        this.groupData.dataSource,
        this.authType,
        this.validateCount
      );
      this.isLoading = false;
    },

    /** Method called when submit button is clicked. Calls method to authenticate phone number.
     * Also, redirects user to the destination and sends a SQS message.
     */
    async authenticateAndRedirect() {
      if (
        redirectToDestination(
          this.purposeParams,
          this.phoneNumberList,
          this.redirectID,
          this.redirectTo,
          this.authType,
          this.group
        )
      ) {
        this.isLoading = false;
        this.authenticatePhoneNumber();
        this;
        sendSQSMessage(
          this.purpose,
          this.purposeParams,
          this.redirectTo,
          this.redirectID,
          this.phoneNumberList,
          this.authType,
          this.group,
          this.userType
        );
      }
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
