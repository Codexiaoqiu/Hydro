import { registerPage } from '../registry/page';
import '../sections';

registerPage('homepage', () => import('./homepage'));
registerPage('problem_main', () => import('./problem_main'));
