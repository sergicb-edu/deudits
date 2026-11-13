import { mount } from 'svelte';
import StudentApp from './StudentApp.svelte';

const target = document.getElementById('app');
if (target) {
  mount(StudentApp, { target });
}
