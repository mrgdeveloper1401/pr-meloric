import { 
  EntitySubscriberInterface, 
  EventSubscriber, 
  InsertEvent,
  DataSource 
} from "typeorm";
import { User } from "../../entity/User";
import { Profile } from "../../entity/Profile";
import { Artist } from "../../entity/Artist";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
    constructor(private dataSource: DataSource) {}
    
    listenTo(): Function | string {
        return User;
    }

    async afterInsert(event: InsertEvent<User>) {
        try {
            const profileRepository = event.manager.getRepository(Profile);
            const artistRepository = event.manager.getRepository(Artist);
            const user = event.entity;

            const profile = new Profile();
            profile.user = user;
            await profileRepository.save(profile);

            if (user.is_artist) {
                const artistProfile = artistRepository.create({
                    user: user,
                    is_active: true,
                    monthly_listeners: 0,
                });
                
                await artistRepository.save(artistProfile);
                console.log(`Artist profile created for user: ${user.username}`);
            }

        } catch (error) {
            throw error;
        }
    }
}