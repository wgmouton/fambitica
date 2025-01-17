<template>
  <div class="row">
    <group-form-modal />
    <secondary-menu class="col-12">
      <router-link
        class="nav-link"
        :to="{name: 'partyDetailTaskInformation'}"
        exact="exact"
        :class="{'active': $route.name === 'partyDetailTaskInformation'}"
      >
        {{ $t('groupTaskBoard') }}
      </router-link>
      <router-link
        class="nav-link"
        :to="{name: 'partyDetailInformation'}"
        exact="exact"
        :class="{'active': $route.name === 'partyDetailInformation'}"
      >
        Party Information
      </router-link>
    </secondary-menu>
    <div class="col-12 px-0">
      <router-view />
    </div>
  </div>
</template>

<script>
import groupFormModal from '@/components/groups/groupFormModal';
import SecondaryMenu from '@/components/secondaryMenu';
import { mapState } from '@/libs/store';

export default {
  components: {
    SecondaryMenu,
    groupFormModal,
  },
  props: ['groupId'],
  computed: {
    ...mapState({
      user: 'user.data',
      groupPlans: 'groupPlans.data',
    }),
    currentGroup () {
      const groupFound = this.groupPlans
        && this.groupPlans.find(group => group._id === this.groupId);

      return groupFound;
    },
    isLeader () {
      if (!this.currentGroup) return false;
      return this.currentGroup.leader === this.user._id;
    },
  },
};
</script>
