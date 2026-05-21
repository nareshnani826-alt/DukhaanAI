import { seedLearningStore } from "./learningStore"
import { SEED_TRAINING }    from "./seedData"

const SEED_VERSION_KEY = "dk_seed_version"
const CURRENT_VERSION  = "v2"

// Run once per device. Skips if this version was already applied.
// Never overwrites corrections the user has already confirmed.
export function initializeSeedTraining() {
  if (localStorage.getItem(SEED_VERSION_KEY) === CURRENT_VERSION) return
  seedLearningStore(SEED_TRAINING)
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_VERSION)
}
