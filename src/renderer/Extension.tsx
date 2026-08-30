import './index.css';

import {ExtensionRendererApi} from '@lynx/plugins/extensions/types/api';

import {SENTRY_DSN} from '../common/constants';
import SkillsToolkitCard from './ToolsPage';

export function InitialExtensions(lynxAPI: ExtensionRendererApi) {
  lynxAPI.initBrowserSentry(SENTRY_DSN);

  // Add the card to the Tools page cards container
  lynxAPI.cards.registerToolsCard?.({
    id: 'skills-toolkit',
    title: 'Skills Manager',
    description: 'Discover, install, update, and manage agent skills from the Vercel Labs registry.',
    component: SkillsToolkitCard,
    where: 'tools_page',
  });

  if (!lynxAPI.cards.registerToolsCard) {
    lynxAPI.customizePages.tools.add.cardsContainer(SkillsToolkitCard);
  }
}
