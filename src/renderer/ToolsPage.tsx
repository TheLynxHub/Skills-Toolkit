import {useOverlayState} from '@heroui/react';
import {ToolsCard} from '@lynx/components/ToolsCard';
import {BookOpen} from 'lucide-react';

import SkillsManagerModal from './SkillsManagerModal';

export function SkillsToolkitCard() {
  const state = useOverlayState();

  return (
    <>
      <SkillsManagerModal state={state} />
      <ToolsCard
        onPress={() => {
          window.dispatchEvent(new CustomEvent('open-skills-manager'));
        }}
        id="skills-toolkit"
        title="Skills Manager"
        icon={<BookOpen className="size-6 text-emerald-400" />}
        description="Discover, install, update, and manage agent skills from the Vercel Labs registry."
      />
    </>
  );
}

export default SkillsToolkitCard;
