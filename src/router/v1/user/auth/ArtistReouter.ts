import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Artist } from "../../../../entity/Artist";
import { plainToClass } from "class-transformer";
import { UpdateArtistProfile } from "../../../../dtos/auth/UpdateArtistProfile";
import { validate } from "class-validator";
import { Image } from "../../../../entity/Image";
import { Follow } from "../../../../entity/Follow";
import { In } from "typeorm";
import { ArtistGalleryImageDto } from "../../../../dtos/artist/ArtistGallery";
import { isArtistUser } from "../../../../middlewares/IsArtist";
import { ArtistSocial } from "../../../../entity/ArtistSocial";
import { ArtistGallery } from "../../../../entity/ArtistGallery";
import { ArtistSocialDto } from "../../../../dtos/artist/ArtistSocial";
import { count } from "console";

export const artistReouter = Router();

// get artist profile
/**
 * @swagger
 * components:
 *   schemas:
 *     Image:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         image_path:
 *           type: string
 *           example: "https://example.com/images/artist-cover.jpg"
 *     GalleryImage:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         image_path:
 *           type: string
 *           example: "https://example.com/images/gallery1.jpg"
 *     SocialLink:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         platform:
 *           type: string
 *           example: "instagram"
 *         url:
 *           type: string
 *           example: "https://instagram.com/artistname"
 *         is_active:
 *           type: boolean
 *           example: true
 *     ArtistProfile:
 *       type: object
 *       properties:
 *         artist_id:
 *           type: integer
 *           example: 1
 *         monthly_listeners:
 *           type: integer
 *           example: 15000
 *         cover_image:
 *           $ref: '#/components/schemas/Image'
 *         bio:
 *           type: string
 *           example: "خواننده و ترانه سرای پاپ با بیش از 10 سال سابقه فعالیت در موسیقی"
 *         profile_image:
 *           $ref: '#/components/schemas/Image'
 *         banner_image:
 *           $ref: '#/components/schemas/Image'
 *         nick_name:
 *           type: string
 *           example: "نام هنری"
 *         gallary_image:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GalleryImage'
 *         social_links:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SocialLink'
 *     ArtistProfileResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           $ref: '#/components/schemas/ArtistProfile'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "error"
 *         message:
 *           type: string
 *           example: "Artist not found"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: "JWT Token برای احراز هویت"
 */
artistReouter.get(
  "/artist_profile/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const artistRepository = AppDataSource.getRepository(Artist);

      const getArtist = await artistRepository
        .createQueryBuilder("artist")
        .leftJoinAndSelect("artist.profile_image", "profile_image")
        .leftJoinAndSelect("artist.cover_image", "cover_image")
        .leftJoinAndSelect("artist.banner_image", "banner_image")
        .leftJoinAndSelect("artist.user", "user")
        .leftJoinAndSelect("artist.gallery_images", "gallery_images")
        .leftJoinAndSelect("gallery_images.image", "gallery_image")
        .leftJoinAndSelect("artist.social_links", "social_links")
        .where("artist.is_active = :isActive", { isActive: true })
        .andWhere("user.id = :userId", { userId })
        .andWhere("user.is_active = :userActive", { userActive: true })
        .andWhere("user.is_artist = :isArtist", { isArtist: true })
        .andWhere("gallery_images.is_active = :galleryActive", {
          galleryActive: true,
        })
        .andWhere("social_links.is_active = :socialActive", {
          socialActive: true,
        })
        .select([
          "artist.id",
          "artist.monthly_listeners",
          "artist.bio",
          "artist.nick_name",
          "artist.first_name",
          "artist.last_name",
          "profile_image.id",
          "profile_image.image_path",
          "cover_image.id",
          "cover_image.image_path",
          "banner_image.id",
          "banner_image.image_path",
          "user.id",
          "user.username",
          "gallery_images.id",
          "gallery_image.id",
          "gallery_image.image_path",
          "social_links.id",
          "social_links.platform",
          "social_links.url",
          "social_links.is_active",
        ])
        .getOne();

      if (!getArtist) {
        return res.status(404).json({
          status: false,
          message: "artist not found",
        });
      }

      const simpleData = {
        artist_id: getArtist.id,
        monthly_listeners: getArtist.monthly_listeners,
        cover_image: getArtist.cover_image
          ? {
              id: getArtist.cover_image.id,
              image_path: getArtist.cover_image.image_path,
            }
          : null,
        bio: getArtist.bio,
        profile_image: getArtist.profile_image
          ? {
              id: getArtist.profile_image.id,
              image_path: getArtist.profile_image.image_path,
            }
          : null,
        banner_image: getArtist.banner_image
          ? {
              id: getArtist.banner_image.id,
              image_path: getArtist.banner_image.image_path,
            }
          : null,
        nick_name: getArtist.nick_name,
        first_name: getArtist.first_name,
        last_name: getArtist.last_name,
        username: getArtist.user.username,
        gallary_image: getArtist.gallery_images
          ? getArtist.gallery_images.map((gallery) => ({
              id: gallery.id,
              image_path: gallery.image?.image_path || null,
            }))
          : [],
        social_links: getArtist.social_links
          ? getArtist.social_links.map((social) => ({
              id: social.id,
              platform: social.platform,
              url: social.url,
            }))
          : [],
      };

      return res.status(200).json({
        status: "success",
        data: simpleData,
      });
    } catch (error) {
      console.error("Error in artist profile:", error);
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// update artiste profile
/**
 * @swagger
 * /v1/user/artist/update_artist_profile/:
 *   patch:
 *     tags:
 *       - Artist
 *     summary: بروزرسانی پروفایل آرتیست
 *     description: |
 *       بروزرسانی اطلاعات پروفایل آرتیست کاربر جاری
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 nullable: true
 *                 description: بیوگرافی آرتیست
 *                 example: "بیوگرافی جدید آرتیست"
 *               cover_image:
 *                 type: integer
 *                 nullable: true
 *                 description: آیدی تصویر کاور
 *                 example: 123
 *               nick_name:
 *                  type: string
 *                  description: لقب ارتیست
 *                  example: string
 *                  nullable: true
 *           examples:
 *             example1:
 *               summary: بروزرسانی کامل
 *               value:
 *                 bio: "بیوگرافی جدید"
 *                 cover_image: 123
 *                 nick_name: "ali rezaei"
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - پروفایل آرتیست با موفقیت بروزرسانی شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistProfileResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   data:
 *                     id: 1
 *                     monthly_listeners: 15000
 *                     bio: "بیوگرافی جدید آرتیست با تجربه‌های تازه"
 *                     cover_image:
 *                       id: 456
 *                       image_path: "https://example.com/images/new-cover.jpg"
 *       '400':
 *         description: |
 *           داده‌های نامعتبر
 *           - validation error
 *           - فرمت داده‌ها صحیح نیست
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validationError:
 *                 summary: خطای اعتبارسنجی
 *                 value:
 *                   status: false
 *                   message: "invalid data"
 *                   error:
 *                     - field: "bio"
 *                       value:
 *                         maxLength: "بیوگرافی نمی‌تواند بیشتر از 500 کاراکتر باشد"
 *                     - field: "cover_image"
 *                       value:
 *                         isInt: "cover_image باید یک عدد صحیح باشد"
 *       '401':
 *         description: |
 *           عدم دسترسی
 *           - توکن JWT معتبر ارائه نشده
 *           - کاربر احراز هویت نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: کاربر احراز هویت نشده
 *                 value:
 *                   status: "error"
 *                   message: "Authentication required"
 *       '404':
 *         description: |
 *           منبع مورد نظر یافت نشد
 *           - آرتیست یافت نشد
 *           - تصویر مورد نظر یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               artistNotFound:
 *                 summary: آرتیست یافت نشد
 *                 value:
 *                   status: false
 *                   message: "artist not found"
 *               imageNotFound:
 *                 summary: تصویر یافت نشد
 *                 value:
 *                   status: false
 *                   message: "image not found"
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 summary: خطای سرور
 *                 value:
 *                   status: false
 *                   message: "server error"
 */
artistReouter.patch(
  "/update_artist_profile/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;

      // check user artist
      const artistRepository = AppDataSource.getRepository(Artist);
      const checkUserArtist = await artistRepository.findOne({
        where: {
          user: {
            id: userId,
            is_active: true,
            is_artist: true,
          },
        },
        relations: {
          cover_image: true,
          banner_image: true,
          profile_image: true,
        },
        select: {
          id: true,
          nick_name: true,
          bio: true,
          first_name: true,
          last_name: true,
          // monthly_listeners: true,
          cover_image: {
            id: true,
            image_path: true,
          },
          profile_image: {
            id: true,
            image_path: true,
          },
          banner_image: {
            id: true,
            image_path: true,
          },
        },
      });

      if (!checkUserArtist) {
        return res.status(404).json({
          status: false,
          message: "artist not found",
        });
      }

      // validate data
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      const updateArtistProfile = plainToClass(UpdateArtistProfile, req.body);
      const errors = await validate(updateArtistProfile);

      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          message: "invalid data",
          error: errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          })),
        });
      }

      const imageRepository = AppDataSource.getRepository(Image);

      // Update cover image
      if (updateArtistProfile.cover_image_id !== undefined) {
        const checkImageUpload = await imageRepository.findOne({
          where: {
            id: updateArtistProfile.cover_image_id,
            is_active: true,
            user: { id: userId },
          },
          select: { id: true, image_path: true },
        });

        if (!checkImageUpload) {
          return res.status(404).json({
            status: false,
            message: "cover image id not found",
          });
        }
        checkUserArtist.cover_image = checkImageUpload;
      }

      // Update profile image - اینجا مشکل بود
      if (updateArtistProfile.profile_image_id !== undefined) {
        const checkProfileImageId = await imageRepository.findOne({
          where: {
            user: { id: userId },
            is_active: true,
            id: updateArtistProfile.profile_image_id,
          },
          select: { id: true, image_path: true },
        });

        if (!checkProfileImageId) {
          return res.status(404).json({
            status: false,
            message: "profile image id not found",
          });
        }
        checkUserArtist.profile_image = checkProfileImageId;
      }

      if (updateArtistProfile.banner_image_id !== undefined) {
        const checkImage = await imageRepository.findOne({
          where: {
            id: updateArtistProfile.banner_image_id,
            is_active: true,
            user: { id: userId },
          },
          select: { id: true, image_path: true },
        });

        if (!checkImage) {
          return res.status(404).json({
            status: false,
            message: "banner image id not found",
          });
        }
        checkUserArtist.banner_image = checkImage;
      }

      // Update other fields
      if (updateArtistProfile.nick_name !== undefined) {
        checkUserArtist.nick_name = updateArtistProfile.nick_name;
      }

      if (updateArtistProfile.bio !== undefined) {
        checkUserArtist.bio = updateArtistProfile.bio;
      }

      if (updateArtistProfile.first_name !== undefined) {
        checkUserArtist.first_name = updateArtistProfile.first_name;
      }

      if (updateArtistProfile.last_name !== undefined) {
        checkUserArtist.last_name = updateArtistProfile.last_name;
      }

      // save
      await artistRepository.save(checkUserArtist);

      return res.status(200).json({
        status: "success",
        data: checkUserArtist,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// get artist public profile
/**
 * @swagger
 * /v1/user/artist/get_artist_public_profile/{artistId}:
 *   get:
 *     tags:
 *       - Artist
 *     summary: دریافت پروفایل عمومی یک آرتیست
 *     description: |
 *       دریافت اطلاعات کامل پروفایل عمومی یک آرتیست خاص
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - آرتیست باید فعال (is_active=true) باشد
 *       - اطلاعات کامل پروفایل، کاور، گالری تصاویر، لینک‌های اجتماعی و وضعیت فالو برگردانده می‌شود
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: artistId
 *         in: path
 *         required: true
 *         description: آیدی عددی آرتیست
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - اطلاعات پروفایل آرتیست بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       description: آیدی کاربر آرتیست
 *                       example: 1
 *                     artist_id:
 *                       type: integer
 *                       description: آیدی آرتیست
 *                       example: 1
 *                     artist_username:
 *                       type: string
 *                       description: نام کاربری آرتیست
 *                       example: "john_doe"
 *                     artist_cover_image:
 *                       type: string
 *                       nullable: true
 *                       description: مسیر تصویر کاور آرتیست
 *                       example: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/1/1759053403801-200735270.jpeg"
 *                     artist_profile_image:
 *                       type: string
 *                       nullable: true
 *                       description: مسیر تصویر پروفایل آرتیست
 *                       example: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/1/1759053403801-200735270.jpeg"
 *                     artist_banner_image:
 *                       type: string
 *                       nullable: true
 *                       description: مسیر تصویر بنر آرتیست
 *                       example: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/1/1759053403801-200735270.jpeg"
 *                     artist_first_name:
 *                       type: string
 *                       nullable: true
 *                       description: نام آرتیست
 *                       example: "جان"
 *                     artist_last_name:
 *                       type: string
 *                       nullable: true
 *                       description: نام خانوادگی آرتیست
 *                       example: "دو"
 *                     monthly_listeners:
 *                       type: integer
 *                       description: تعداد شنوندگان ماهانه
 *                       example: 0
 *                     bio:
 *                       type: string
 *                       description: بیوگرافی آرتیست
 *                       example: "بیوگرافی جدید یذیبذیذ"
 *                     nick_name:
 *                       type: string
 *                       description: نام هنری
 *                       example: "ali rezaei"
 *                     gallery_images:
 *                       type: array
 *                       description: لیست تصاویر گالری
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           image_path:
 *                             type: string
 *                             example: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/19/1758717049408-462980426.jpeg"
 *                     artist_social:
 *                       type: array
 *                       description: لیست شبکه های اجتماعی آرتیست
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           platform:
 *                             type: string
 *                             example: "instagram"
 *                           url:
 *                             type: string
 *                             example: "https://instagram.com/artistname"
 *                 is_follow:
 *                   type: boolean
 *                   description: وضعیت فالو کردن توسط کاربر جاری
 *                   example: false
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_artist_id:
 *                 summary: artist_id نامعتبر
 *                 value:
 *                   status: false
 *                   message: "artist_id must be required"
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: کاربر لاگین نکرده است
 *                 value:
 *                   status: false
 *                   message: "Authentication required"
 *       '404':
 *         description: آرتیست پیدا نشد یا غیرفعال است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               artist_not_found:
 *                 summary: آرتیست یافت نشد
 *                 value:
 *                   status: false
 *                   message: "artist not found"
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: خطای سرور
 *                 value:
 *                   status: false
 *                   message: "server error"
 */
artistReouter.get(
  "/get_artist_public_profile/:artistId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const artistId = Number(req.params.artistId);
      if (isNaN(artistId)) {
        return res.status(400).json({
          status: false,
          message: "artist_id must be a valid number",
        });
      }

      const artistRepository = AppDataSource.getRepository(Artist);
      const getArtist = await artistRepository
        .createQueryBuilder("artist")
        .leftJoinAndSelect("artist.cover_image", "cover_image")
        .leftJoinAndSelect("artist.profile_image", "profile_image")
        .leftJoinAndSelect("artist.banner_image", "banner_image")
        .leftJoinAndSelect("artist.user", "user")
        .leftJoinAndSelect("artist.gallery_images", "gallery_images")
        .leftJoinAndSelect("gallery_images.image", "gallery_image")
        .leftJoinAndSelect("artist.social_links", "social_links")
        .where("artist.id = :artistId", { artistId })
        .andWhere("artist.is_active = :is_active", { is_active: true })
        .select([
          "artist.id",
          "artist.bio",
          "artist.first_name",
          "artist.last_name",
          "artist.nick_name",
          "artist.monthly_listeners",
          "cover_image.id",
          "cover_image.image_path",
          "profile_image.id",
          "profile_image.image_path",
          "banner_image.id",
          "banner_image.image_path",
          "user.id",
          "user.username",
          "gallery_images.id",
          "gallery_images.is_active",
          "gallery_image.id",
          "gallery_image.image_path",
          "social_links.id",
          "social_links.platform",
          "social_links.url",
          "social_links.is_active",
        ])
        .getOne();

      if (!getArtist) {
        return res.status(404).json({
          status: false,
          message: "artist not found",
        });
      }

      const followRepository = AppDataSource.getRepository(Follow);
      const request_user_id = (req as any).user.user_id;
      const checkFollow = await followRepository.findOne({
        where: {
          from_user: { id: request_user_id },
          is_active: true,
          to_user: { id: getArtist.user.id },
        },
      });

      let isFollow = false;
      if (checkFollow) {
        isFollow = true;
      }

      const simpleData = {
        user_id: getArtist.user.id,
        artist_id: getArtist.id,
        artist_username: getArtist.user.username,
        artist_cover_image: getArtist.cover_image?.image_path || null,
        artist_profile_image: getArtist.profile_image?.image_path || null,
        artist_banner_image: getArtist.banner_image?.image_path || null,
        artist_first_name: getArtist.first_name || null,
        artist_last_name: getArtist.last_name || null,
        monthly_listeners: getArtist.monthly_listeners || 0,
        bio: getArtist.bio,
        nick_name: getArtist.nick_name,
        gallery_images: getArtist.gallery_images.map((gallery) => ({
          id: gallery.id,
          image_path: gallery.image?.image_path || null,
        })),
        artist_social: getArtist.social_links.map((social) => ({
          id: social.id,
          platform: social.platform,
          url: social.url,
        })),
      };

      return res.status(200).json({
        status: "success",
        data: simpleData,
        is_follow: isFollow,
      });
    } catch (error) {
      console.error("Error in public artist profile:", error);
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// create gallery images
/**
 * @swagger
 * /v1/user/artist/public_artist_profile/gallery_images:
 *   post:
 *     tags:
 *       - Artist
 *     summary: افزودن تصویر جدید به گالری آرتیست
 *     description: |
 *       افزودن یک تصویر به گالری تصاویر آرتیست
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - کاربر باید آرتیست باشد (isArtistUser)
 *       - تصویر باید متعلق به کاربر جاری باشد
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image_id
 *             properties:
 *               image_id:
 *                 type: integer
 *                 description: آیدی تصویر
 *                 example: 1
 *               order:
 *                 type: integer
 *                 description: ترتیب نمایش تصویر در گالری
 *                 default: 0
 *                 example: 1
 *     responses:
 *       '201':
 *         description: موفقیت‌آمیز - تصویر به گالری اضافه شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "created"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     artist_id:
 *                       type: integer
 *                       example: 1
 *                     image_id:
 *                       type: integer
 *                       example: 1
 *       '400':
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: آرتیست یا تصویر پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.post(
  "/public_artist_profile/gallery_images",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      const artistGalleryImageDto = plainToClass(
        ArtistGalleryImageDto,
        req.body
      );
      const errors = await validate(artistGalleryImageDto);
      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          message: "invalid data",
          error: errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          })),
        });
      }

      // check image
      const userId = (req as any).user.user_id;
      const imageRepository = AppDataSource.getRepository(Image);
      const checkImage = await imageRepository.findOne({
        where: {
          id: artistGalleryImageDto.image_id,
          is_active: true,
          user: { id: userId },
        },
        select: { id: true },
      });
      if (!checkImage) {
        return res.status(404).json({
          status: false,
          message: "image not found",
        });
      } else {
        const artistGalleryRepo = AppDataSource.getRepository(ArtistGallery);
        const checkDuplicate = await artistGalleryRepo.findOne({
          where: {
            is_active: true,
            artist: (req as any).artist,
            image: checkImage,
          },
          select: { id: true },
        });
        if (checkDuplicate) {
          return res.status(403).json({
            status: false,
            message: "image already exists",
          });
        }
      }

      const gallaryImage = new ArtistGallery();
      gallaryImage.order = artistGalleryImageDto.order;
      gallaryImage.image = checkImage;
      gallaryImage.artist = (req as any).artist;
      await gallaryImage.save();

      return res.status(201).json({
        status: false,
        message: "created",
        data: {
          id: gallaryImage.id,
          artist_id: gallaryImage.artist.id,
          image_id: gallaryImage.image.id,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// get list artist gallery_image
/**
 * @swagger
 * /v1/user/artist/public_artist_profile/gallery_images:
 *   get:
 *     tags:
 *       - Artist
 *     summary: دریافت لیست تصاویر گالری آرتیست جاری
 *     description: |
 *       دریافت تمام تصاویر فعال گالری آرتیست جاری
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - کاربر باید آرتیست باشد (isArtistUser)
 *       - فقط تصاویر فعال برگردانده می‌شوند
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لیست تصاویر گالری بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       image_id:
 *                         type: integer
 *                         example: 1
 *                       image_path:
 *                         type: string
 *                         example: "https://example.com/image.jpg"
 *                       order:
 *                         type: integer
 *                         example: 1
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T12:00:00.000Z"
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: آرتیست پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.get(
  "/public_artist_profile/gallery_images",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;

      // پیدا کردن آرتیست جاری
      const artistRepository = AppDataSource.getRepository(Artist);
      const artist = await artistRepository.findOne({
        where: {
          user: { id: userId },
          is_active: true,
        },
        select: { id: true },
      });

      if (!artist) {
        return res.status(404).json({
          status: false,
          message: "artist not found",
        });
      }

      // دریافت تصاویر گالری
      const galleryRepository = AppDataSource.getRepository(ArtistGallery);
      const galleryImages = await galleryRepository.find({
        where: {
          artist: { id: artist.id },
          is_active: true,
        },
        relations: {
          image: true,
        },
        order: {
          order: "ASC",
        },
        select: {
          id: true,
          order: true,
          image: {
            id: true,
            image_path: true,
          },
        },
      });

      const formattedImages = galleryImages.map((item) => ({
        id: item.id,
        image_id: item.image.id,
        image_path: item.image.image_path,
        order: item.order,
      }));

      return res.status(200).json({
        status: true,
        data: formattedImages,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// delete gallaery_image
/**
 * @swagger
 * /v1/user/artist/public_artist_profile/gallery_images/{galleryImageId}:
 *   delete:
 *     tags:
 *       - Artist
 *     summary: حذف تصویر از گالری آرتیست
 *     description: |
 *       حذف یک تصویر از گالری آرتیست جاری
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - کاربر باید آرتیست باشد (isArtistUser)
 *       - تصویر باید متعلق به آرتیست جاری باشد
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: galleryImageId
 *         in: path
 *         required: true
 *         description: آیدی تصویر در گالری
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - تصویر از گالری حذف شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "gallery image deleted successfully"
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: تصویر گالری پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.delete(
  "/public_artist_profile/gallery_images/:galleryImageId",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      const galleryImageId = Number(req.params.galleryImageId);
      if (isNaN(galleryImageId)) {
        return res.status(400).json({
          status: false,
          message: "galleryImageId must be a valid number",
        });
      }

      const userId = (req as any).user.user_id;

      // پیدا کردن آرتیست جاری
      const artistRepository = AppDataSource.getRepository(Artist);
      const artist = await artistRepository.findOne({
        where: {
          user: { id: userId },
          is_active: true,
        },
        select: { id: true },
      });

      if (!artist) {
        return res.status(404).json({
          status: false,
          message: "artist not found",
        });
      }

      // پیدا کردن تصویر گالری
      const galleryRepository = AppDataSource.getRepository(ArtistGallery);
      const galleryImage = await galleryRepository.findOne({
        where: {
          id: galleryImageId,
          artist: { id: artist.id },
          is_active: true,
        },
      });

      if (!galleryImage) {
        return res.status(404).json({
          status: false,
          message: "gallery image not found",
        });
      }

      // حذف نرم (soft delete) با تغییر is_active به false
      galleryImage.is_active = false;
      await galleryRepository.save(galleryImage);

      return res.status(200).json({
        status: true,
        message: "gallery image deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// create artist scoial
/**
 * @swagger
 * /v1/user/artist/public_artist_profile/social_links:
 *   post:
 *     tags:
 *       - Artist Social
 *     summary: افزودن لینک اجتماعی جدید برای آرتیست
 *     description: |
 *       افزودن یک لینک اجتماعی به پروفایل آرتیست
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - کاربر باید آرتیست باشد (isArtistUser)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - url
 *             properties:
 *               platform:
 *                 type: string
 *                 description: instagram,twitter,youtube
 *                 example: "instagram"
 *                 maxLength: 50
 *               url:
 *                 type: string
 *                 description: آدرس کامل لینک اجتماعی
 *                 example: "https://instagram.com/artistname"
 *                 maxLength: 500
 *     responses:
 *       '201':
 *         description: موفقیت‌آمیز - لینک اجتماعی اضافه شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "social link created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     platform:
 *                       type: string
 *                       example: "instagram"
 *                     url:
 *                       type: string
 *                       example: "https://instagram.com/artistname"
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: عدم دسترسی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: آرتیست پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.post(
  "/public_artist_profile/social_links",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      const { platform, url } = req.body;

      // اعتبارسنجی فیلدهای اجباری
      if (!platform || !url) {
        return res.status(400).json({
          status: false,
          message: "platform and url are required",
        });
      }

      if (platform.length > 50) {
        return res.status(400).json({
          status: false,
          message: "platform must be less than 50 characters",
        });
      }

      if (url.length > 500) {
        return res.status(400).json({
          status: false,
          message: "url must be less than 500 characters",
        });
      }

      const userId = (req as any).user.user_id;

      // پیدا کردن آرتیست جاری
      const artistRepository = AppDataSource.getRepository(Artist);
      const artist = await artistRepository.findOne({
        where: {
          user: { id: userId },
          is_active: true,
        },
        select: { id: true },
      });

      if (!artist) {
        return res.status(404).json({
          status: false,
          message: "artist not found",
        });
      }

      // ایجاد لینک اجتماعی جدید
      const socialRepository = AppDataSource.getRepository(ArtistSocial);
      const newSocialLink = new ArtistSocial();
      newSocialLink.platform = platform;
      newSocialLink.url = url;
      newSocialLink.artist = artist;
      newSocialLink.is_active = true;

      await socialRepository.save(newSocialLink);

      return res.status(201).json({
        status: true,
        message: "social link created successfully",
        data: {
          id: newSocialLink.id,
          platform: newSocialLink.platform,
          url: newSocialLink.url,
        },
      });
    } catch (error) {
      console.error("Error creating social link:", error);
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// list artist scoial
/**
 * @swagger
 * /v1/user/artist/public_artist_profile/social_links:
 *   get:
 *     tags:
 *       - Artist Social
 *     summary: دریافت لیست لینک‌های اجتماعی آرتیست
 *     description: |
 *       دریافت تمام لینک‌های اجتماعی فعال آرتیست جاری
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لیست لینک‌های اجتماعی بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       platform:
 *                         type: string
 *                         example: "instagram"
 *                       url:
 *                         type: string
 *                         example: "https://instagram.com/artistname"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       '401':
 *         description: عدم دسترسی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: آرتیست پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.get(
  "/public_artist_profile/social_links",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      const socialRepository = AppDataSource.getRepository(ArtistSocial);
      const socialLinks = await socialRepository.find({
        where: {
          artist: (req as any).artist,
          is_active: true,
        },
        select: {
          id: true,
          platform: true,
          url: true,
        },
      });

      return res.status(200).json({
        status: true,
        data: socialLinks,
      });
    } catch (error) {
      console.error("Error getting social links:", error);
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// update artist social
/**
 * @swagger
 * /v1/user/artist/public_artist_profile/social_links/{socialLinkId}:
 *   patch:
 *     tags:
 *       - Artist Social
 *     summary: به‌روزرسانی لینک اجتماعی
 *     description: |
 *       به‌روزرسانی اطلاعات یک لینک اجتماعی خاص
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: socialLinkId
 *         in: path
 *         required: true
 *         description: آیدی لینک اجتماعی
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 description: پلتفرم اجتماعی
 *                 example: "twitter"
 *                 maxLength: 50
 *               url:
 *                 type: string
 *                 description: آدرس کامل لینک اجتماعی
 *                 example: "https://twitter.com/artistname"
 *                 maxLength: 500
 *               is_active:
 *                 type: boolean
 *                 description: وضعیت فعال بودن لینک
 *                 example: true
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لینک اجتماعی به‌روزرسانی شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "social link updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     platform:
 *                       type: string
 *                       example: "twitter"
 *                     url:
 *                       type: string
 *                       example: "https://twitter.com/artistname"
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: عدم دسترسی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: لینک اجتماعی پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.patch(
  "/public_artist_profile/social_links/:socialLinkId",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      const socialLinkId = Number(req.params.socialLinkId);
      if (isNaN(socialLinkId)) {
        return res.status(400).json({
          status: false,
          message: "socialLinkId must be a valid number",
        });
      }

      // validate
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body json is required",
        });
      }
      const artistSocialDto = plainToClass(ArtistSocialDto, req.body);
      const errors = await validate(artistSocialDto);
      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          message: "invalid data",
          error: errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          })),
        });
      }

      // find social
      const socialRepository = AppDataSource.getRepository(ArtistSocial);
      const socialLink = await socialRepository.findOne({
        where: {
          id: socialLinkId,
          artist: (req as any).artist,
          is_active: true,
        },
      });

      if (!socialLink) {
        return res.status(404).json({
          status: false,
          message: "social link not found",
        });
      }

      // update field
      if (artistSocialDto.platform !== undefined)
        socialLink.platform = artistSocialDto.platform;
      if (artistSocialDto.url !== undefined)
        socialLink.url = artistSocialDto.url;

      await socialRepository.save(socialLink);

      return res.status(200).json({
        status: true,
        message: "social link updated successfully",
        data: {
          id: socialLink.id,
          platform: socialLink.platform,
          url: socialLink.url,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


// delete artist social
/**
 * @swagger
 * /v1/user/artist/public_artist_profile/social_links/{socialLinkId}:
 *   delete:
 *     tags:
 *       - Artist Social
 *     summary: حذف لینک اجتماعی
 *     description: |
 *       حذف یک لینک اجتماعی از پروفایل آرتیست
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: socialLinkId
 *         in: path
 *         required: true
 *         description: آیدی لینک اجتماعی
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لینک اجتماعی حذف شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "social link deleted successfully"
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: عدم دسترسی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: لینک اجتماعی پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.delete(
  "/public_artist_profile/social_links/:socialLinkId",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      const socialLinkId = Number(req.params.socialLinkId);
      if (isNaN(socialLinkId)) {
        return res.status(400).json({
          status: false,
          message: "socialLinkId must be a valid number",
        });
      }

      // find social
      const socialRepository = AppDataSource.getRepository(ArtistSocial);
      const socialLink = await socialRepository.findOne({
        where: {
          id: socialLinkId,
          artist: (req as any).artist,
          is_active: true,
        },
      });

      if (!socialLink) {
        return res.status(404).json({
          status: false,
          message: "social link not found",
        });
      }

      // (soft delete)
      socialLink.is_active = false;
      await socialRepository.save(socialLink);

      return res.status(200).json({
        status: true,
        message: "social link deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);


/**
 * @swagger
 * /v1/user/artist/music/artist_list:
 *   get:
 *     tags:
 *       - Artist
 *     summary: دریافت لیست آرتیست‌ها
 *     description: |
 *       دریافت لیست آرتیست‌های فعال با امکان جستجو و صفحه‌بندی
 *       - امکان جستجو بر اساس username
 *       - صفحه‌بندی خودکار
 *       - فقط آرتیست‌های فعال نمایش داده می‌شوند
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         description: تعداد آیتم در هر صفحه (پیش‌فرض ۲۰)
 *         schema:
 *           type: integer
 *           example: 20
 *           minimum: 1
 *           maximum: 100
 *       - name: page
 *         in: query
 *         required: false
 *         description: شماره صفحه (پیش‌فرض ۱)
 *         schema:
 *           type: integer
 *           example: 1
 *           minimum: 1
 *       - name: search
 *         in: query
 *         required: false
 *         description: عبارت جستجو برای فیلتر کردن نتایج (username)
 *         schema:
 *           type: string
 *           example: "ali"
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لیست آرتیست‌ها
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "success"
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 20
 *                 total:
 *                   type: integer
 *                   example: 150
 *                 total_pages:
 *                   type: integer
 *                   example: 8
 *                 count:
 *                   type: integer
 *                   example: 20
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       full_name:
 *                         type: string
 *                         example: "علی محمدی"
 *                       nick_name:
 *                         type: string
 *                         example: "علی"
 *                         nullable: true
 *                       monthly_listeners:
 *                         type: integer
 *                         example: 15000
 *                       username:
 *                         type: string
 *                         example: "ali_mohammadi"
 *                       cover_image:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 123
 *                           image_path:
 *                             type: string
 *                             example: "/uploads/artists/cover/123.jpg"
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: دسترسی غیرمجاز (کاربر آرتیست نیست)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
artistReouter.get(
  "/music/artist_list/",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 20;
      const page = Number(req.query.page) || 1;
      const search = req.query.search as string;
      const skip = (page - 1) * limit;

      const artistRepository = AppDataSource.getRepository(Artist);

      const query = artistRepository.createQueryBuilder("artist")
        .leftJoinAndSelect("artist.cover_image", "cover_image")
        .leftJoinAndSelect("artist.user", "user")
        .where("artist.is_active = :isActive", { isActive: true })
        .select([
          "artist.id",
          "artist.first_name",
          "artist.last_name",
          "artist.nick_name",
          "artist.monthly_listeners",
          "cover_image.id",
          "cover_image.image_path",
          "user.id",
          "user.username"
        ]);

      if (search) {
        query.andWhere(
          "(user.username LIKE :search)",
          { search: `%${search}%` }
        );
      }

      query.skip(skip).take(limit);

      const [artists, total] = await query.getManyAndCount();

      const simpleData = artists.map(artist => ({
        id: artist.id,
        full_name: artist.first_name && artist.last_name 
          ? `${artist.first_name} ${artist.last_name}`
          : artist.nick_name || "بدون نام",
        nick_name: artist.nick_name,
        monthly_listeners: artist.monthly_listeners,
        username: artist.user?.username,
        cover_image: artist.cover_image ? {
          id: artist.cover_image.id,
          image_path: artist.cover_image.image_path
        } : null
      }));

      return res.status(200).json({
        message: "success",
        page: page,
        limit: limit,
        total: total,
        total_pages: Math.ceil(total / limit),
        count: artists.length,
        data: simpleData
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message
      });
    }
  }
);