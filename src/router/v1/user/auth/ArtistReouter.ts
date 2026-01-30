import { Request, Response, Router } from "express";
import { authenticateJWT, isArtistUserMiddlewere } from "../../../../middlewares/authenticate";
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
        // .leftJoinAndSelect("artist.profile_image", "profile_image")
        .leftJoinAndSelect("artist.user", "user")
        .leftJoinAndSelect("user.cover_image", "cover_image")
        .leftJoinAndSelect("user.banner_image", "banner_image")
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
          "user.first_name",
          "user.last_name",
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
        cover_image: getArtist.user.cover_image
          ? {
              id: getArtist.user.cover_image.id,
              image_path: getArtist.user.cover_image.image_path,
            }
          : null,
        bio: getArtist.bio,
        profile_image: getArtist.user.profile_image
          ? {
              id: getArtist.user.profile_image.id,
              image_path: getArtist.user.profile_image.image_path,
            }
          : null,
        banner_image: getArtist.user.profile
          ? {
              id: getArtist.user.profile.banner_image.id,
              image_path: getArtist.user.profile.banner_image.image_path,
            }
          : null,
        nick_name: getArtist.nick_name,
        first_name: getArtist.user.first_name || null,
        last_name: getArtist.user.last_name || null,
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
 *       - کاربر باید احراز هویت شده باشد
 *       - کاربر باید دارای حساب آرتیست فعال باشد
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               birth_date:
 *                 type: string
 *                 nullable: true
 *                 example: 2026-01-01
 *               bio:
 *                 type: string
 *                 nullable: true
 *                 description: بیوگرافی آرتیست
 *                 maxLength: 500
 *                 example: "بیوگرافی جدید آرتیست"
 *               nick_name:
 *                 type: string
 *                 description: لقب آرتیست
 *                 nullable: true
 *                 maxLength: 100
 *                 example: "ali rezaei"
 *               first_name:
 *                 type: string
 *                 description: نام
 *                 nullable: true
 *                 maxLength: 100
 *                 example: "علی"
 *               last_name:
 *                 type: string
 *                 description: نام خانوادگی
 *                 nullable: true
 *                 maxLength: 100
 *                 example: "رضایی"
 *               cover_image_id:
 *                 type: integer
 *                 nullable: true
 *                 description: آیدی تصویر کاور
 *                 example: 123
 *               profile_image_id:
 *                 type: integer
 *                 nullable: true
 *                 description: آیدی تصویر پروفایل
 *                 example: 456
 *               banner_image_id:
 *                 type: integer
 *                 nullable: true
 *                 description: آیدی تصویر بنر
 *                 example: 789
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - پروفایل آرتیست با موفقیت بروزرسانی شد
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     nick_name:
 *                       type: string
 *                       nullable: true
 *                       example: "ali rezaei"
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                       example: "بیوگرافی جدید"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         first_name:
 *                           type: string
 *                           nullable: true
 *                           example: "علی"
 *                         last_name:
 *                           type: string
 *                           nullable: true
 *                           example: "رضایی"
 *                         bio:
 *                           type: string
 *                           nullable: true
 *                           example: "بیوگرافی کاربر"
 *                         cover_image:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 123
 *                             image_path:
 *                               type: string
 *                               example: "https://example.com/images/cover.jpg"
 *                         profile_image:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 456
 *                             image_path:
 *                               type: string
 *                               example: "https://example.com/images/profile.jpg"
 *                         profile:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             banner_image:
 *                               type: object
 *                               nullable: true
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   example: 789
 *                                 image_path:
 *                                   type: string
 *                                   example: "https://example.com/images/banner.jpg"
 *       '400':
 *         description: |
 *           داده‌های نامعتبر
 *           - validation error
 *           - فرمت داده‌ها صحیح نیست
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
 *                   example: "invalid data"
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *       '401':
 *         description: |
 *           عدم دسترسی
 *           - توکن JWT معتبر ارائه نشده
 *           - کاربر احراز هویت نشده
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
 *                   example: "Authentication required"
 *       '403':
 *         description: |
 *           دسترسی غیرمجاز
 *           - کاربر حساب آرتیست ندارد
 *           - حساب آرتیست غیرفعال است
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
 *                   example: "Your account is not an artist account"
 *       '404':
 *         description: |
 *           منبع مورد نظر یافت نشد
 *           - آرتیست یافت نشد
 *           - تصویر مورد نظر یافت نشد
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
 *                   example: "artist not found"
 *       '500':
 *         description: خطای داخلی سرور
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
 *                   example: "server error"
 *                 error:
 *                   type: string
 */
artistReouter.patch(
  "/update_artist_profile/",
  authenticateJWT,
  isArtistUserMiddlewere,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;

      // find artist with user relations
      const artistRepository = AppDataSource.getRepository(Artist);
      const artist = await artistRepository.findOne({
        where: {
          user: { id: userId },
        },
        relations: {
          banner_image: true,
          user: {
            cover_image: true,
            profile_image: true,
          },
        },
        select: {
          id: true,
          nick_name: true,
          bio: true,
          banner_image: {
            id: true,
            image_path: true
          },
          user: {
            id: true,
            first_name: true,
            last_name: true,
            bio: true,
            cover_image: {
              id: true,
              image_path: true,
            },
            profile_image: {
              id: true,
              image_path: true,
            }
          },
        },
      });

      // validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          status: false,
          message: "request body is required with at least one field",
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
        const coverImage = await imageRepository.findOne({
          where: {
            id: updateArtistProfile.cover_image_id,
            is_active: true,
            user: { id: userId },
          },
          select: {id: true}
        });

        if (!coverImage) {
          return res.status(404).json({
            status: false,
            message: "cover image not found",
          });
        }
        artist.user.cover_image = coverImage;
      }

      // Update profile image
      if (updateArtistProfile.profile_image_id !== undefined) {
        const profileImage = await imageRepository.findOne({
          where: {
            id: updateArtistProfile.profile_image_id,
            is_active: true,
            user: { id: userId },
          },
          select: {id: true}
        });

        if (!profileImage) {
          return res.status(404).json({
            status: false,
            message: "profile image not found",
          });
        }
        artist.user.profile_image = profileImage;
      }

      // Update banner image
      if (updateArtistProfile.banner_image_id !== undefined) {
        const bannerImage = await imageRepository.findOne({
          where: {
            id: updateArtistProfile.banner_image_id,
            is_active: true,
            user: { id: userId },
          },
          select: {id: true}
        });

        if (!bannerImage) {
          return res.status(404).json({
            status: false,
            message: "banner image not found",
          });
        }
        
        artist.banner_image = bannerImage;
      }

      // Update other fields
      if (updateArtistProfile.nick_name !== undefined) {
        artist.nick_name = updateArtistProfile.nick_name;
      }

      if (updateArtistProfile.bio !== undefined) {
        artist.bio = updateArtistProfile.bio;
      }

      if (updateArtistProfile.first_name !== undefined) {
        artist.user.first_name = updateArtistProfile.first_name;
      }

      if (updateArtistProfile.last_name !== undefined) {
        artist.user.last_name = updateArtistProfile.last_name;
      }

      if (updateArtistProfile.birth_date !== undefined){
        artist.user.birth_date = new Date(updateArtistProfile.birth_date);
      }
      // Save changes
      await artist.save();
      await artist.user.save();

      return res.status(200).json({
        status: "success",
        data: artist,
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
        .leftJoinAndSelect("artist.user", "user")
        .leftJoinAndSelect("user.cover_image", "cover_image")
        .leftJoinAndSelect("user.profile_image", "profile_image")
        .leftJoinAndSelect("artist.banner_image", "banner_image")
        .leftJoinAndSelect("artist.gallery_images", "gallery_images")
        .leftJoinAndSelect("gallery_images.image", "gallery_image")
        .leftJoinAndSelect("artist.social_links", "social_links")
        .where("artist.is_active = :is_active AND artist.id = :artistId", { is_active: true, artistId: artistId })
        .select([
          "artist.id",
          "artist.bio",
          "user.first_name",
          "user.last_name",
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
        relations: {
          from_user: true,
          to_user: true
        },
        select: {
          id: true,
          to_user: {
            id: true
          },
          from_user: {
            id: true
          }
        }
      });

      let isFollow = false;
      if (checkFollow) {
        isFollow = true;
      }

      const simpleData = {
        user_id: getArtist.user.id,
        artist_id: getArtist.id,
        artist_username: getArtist.user.username,
        artist_cover_image: getArtist.user.cover_image?.image_path || null,
        artist_profile_image: getArtist.user.profile_image?.image_path || null,
        artist_banner_image: getArtist.banner_image?.image_path || null,
        artist_first_name: getArtist.user.first_name || null,
        artist_last_name: getArtist.user.last_name || null,
        monthly_listeners: getArtist.monthly_listeners || 0,
        bio: getArtist.bio,
        nick_name: getArtist.nick_name,
        gallery_images: getArtist.gallery_images
        .filter(gallery => gallery.is_active)
        .map((gallery) => ({
          id: gallery.id,
          image_path: gallery.image?.image_path || null,
        })),
        artist_social: getArtist.social_links
        .filter(social => social.is_active)
        .map((social) => ({
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
 *               image_ids:
 *                 type: array
 *                 description: آیدی تصویر
 *                 example: [1,2,3]
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
            constraints: err.constraints,
          })),
        });
      }

      const userId = (req as any).user.user_id;
      const artist = (req as any).artist;
      
      const imageRepository = AppDataSource.getRepository(Image);
      
      const images = await imageRepository.find({
        where: {
          id: In(artistGalleryImageDto.image_ids),
          is_active: true,
          user: { id: userId },
        },
        select: { id: true },
      });

      if (images.length === 0) {
        return res.status(404).json({
          status: false,
          message: "هیچ تصویری یافت نشد",
        });
      }

      const validImageIds = images.map(img => img.id);
      
      const artistGalleryRepo = AppDataSource.getRepository(ArtistGallery);
      
      const duplicates = await artistGalleryRepo.find({
        where: {
          is_active: true,
          artist: { id: artist.id },
          image: { id: In(validImageIds) },
        },
        relations: ['image'],
        select: {
          id: true,
          image: { id: true }
        }
      });

      const duplicateImageIds = duplicates.map(dup => dup.image.id);
      const newImageIds = validImageIds.filter(
        id => !duplicateImageIds.includes(id)
      );

      if (newImageIds.length === 0) {
        return res.status(400).json({
          status: false,
          message: "تمام تصاویر قبلاً در گالری اضافه شده‌اند",
          duplicate_images: duplicateImageIds
        });
      }

      const galleryImagesToSave = [];
      let orderCounter = artistGalleryImageDto.order || 0;

      for (const imageId of newImageIds) {
        const image = images.find(img => img.id === imageId);
        
        if (image) {
          const galleryImage = new ArtistGallery();
          galleryImage.order = orderCounter++;
          galleryImage.image = image;
          galleryImage.artist = artist;
          galleryImage.is_active = true;
          
          galleryImagesToSave.push(galleryImage);
        }
      }

      const savedGalleryImages = await artistGalleryRepo.save(galleryImagesToSave);

      await artistGalleryRepo
        .createQueryBuilder()
        .insert()
        .into(ArtistGallery)
        .values(galleryImagesToSave.map(img => ({
          artist_id: img.artist.id,
          image_id: img.image.id,
          order: img.order,
          is_active: img.is_active,
          created_at: new Date(),
          updated_at: new Date()
        })))
        .execute();

      const responseData = savedGalleryImages.map(item => ({
        id: item.id,
        artist_id: item.artist.id,
        image_id: item.image.id,
        order: item.order
      }));

      return res.status(201).json({
        status: true,
        message: `${savedGalleryImages.length} تصویر با موفقیت اضافه شد`,
        data: responseData,
        ...(duplicateImageIds.length > 0 && {
          warnings: {
            message: `${duplicateImageIds.length} تصویر قبلاً اضافه شده بودند`,
            duplicate_ids: duplicateImageIds
          }
        })
      });

    } catch (error) {
      console.error("Error adding gallery images:", error);
      return res.status(500).json({
        status: false,
        message: "server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

      // check artist
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

      // find gallery_image
      const galleryRepository = AppDataSource.getRepository(ArtistGallery);
      const galleryImage = await galleryRepository.findOne({
        where: {
          id: galleryImageId,
          artist: { id: artist.id },
          is_active: true,
        },
        select: {
          id: true,
          is_active: true
        }
      });

      if (!galleryImage) {
        return res.status(404).json({
          status: false,
          message: "gallery image not found",
        });
      }

      // soft delete
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
 *       - Artist
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
 *       - Artist
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
 *       - Artist
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

      // save in database
      await socialRepository.save(socialLink);

      return res.status(200).json({
        status: true,
        message: "social link updated successfully",
        data: {
          id: socialLink.id,
          platform: socialLink.platform,
          url: socialLink.url,
          is_active: socialLink.is_active
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
 *       - Artist
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
        select: {
          id: true,
          is_active: true
        }
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

// artist list
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
      const search = req.query.search;
      const skip = (page - 1) * limit;

      const artistRepository = AppDataSource.getRepository(Artist);

      const query = artistRepository.createQueryBuilder("artist")
      .leftJoinAndSelect("artist.user", "user")
        .leftJoinAndSelect("user.profile_image", "profile_image")
        .where("user.is_active = :isActive", { isActive: true })
        .select([
          "artist.id",
          "user.first_name",
          "user.last_name",
          "artist.nick_name",
          "artist.monthly_listeners",
          "profile_image.id",
          "profile_image.image_path",
          "user.id",
          "user.username"
        ]);

      if (search) {
        query.andWhere(
          "(user.username ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      query.skip(skip).take(limit);

      const [artists, total] = await query.getManyAndCount();

      const simpleData = artists.map(artist => ({
        id: artist.id,
        full_name: `${artist.user.first_name} ${artist.user.last_name}`,
        nick_name: artist?.nick_name || null,
        monthly_listeners: artist?.monthly_listeners || 0,
        username: artist.user.username,
        profile_image: artist.user.profile_image ? {
          id: artist.user.profile_image.id,
          image_path: artist.user.profile_image.image_path
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

// get owner artist profile
/**
 * @swagger
 * /v1/user/artist/get_artist_profile/view:
 *   get:
 *     tags:
 *       - Artist
 *     summary: دریافت پروفایل آرتیست
 *     description: |
 *       دریافت اطلاعات کامل پروفایل عمومی یک آرتیست خاص
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - آرتیست باید فعال (is_active=true) باشد
 *       - اطلاعات کامل پروفایل، کاور، گالری تصاویر، لینک‌های اجتماعی و وضعیت فالو برگردانده می‌شود
 *     security:
 *       - bearerAuth: []
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
  "/get_artist_profile/view/",
  authenticateJWT,
  isArtistUser,
  async (req: Request, res: Response) => {
    try {
      const artistId = (req as any).artist.id;

      const artistRepository = AppDataSource.getRepository(Artist);
      const getArtist = await artistRepository
        .createQueryBuilder("artist")
        .leftJoinAndSelect("artist.user", "user")
        .leftJoinAndSelect("user.cover_image", "cover_image")
        .leftJoinAndSelect("user.profile_image", "profile_image")
        // .leftJoinAndSelect("profile.banner_image", "banner_image")
        .leftJoinAndSelect("artist.gallery_images", "gallery_images")
        .leftJoinAndSelect("gallery_images.image", "gallery_image")
        .leftJoinAndSelect("artist.social_links", "social_links")
        .where("artist.is_active = :is_active AND artist.id = :artistId", { is_active: true, artistId: artistId })
        .select([
          "artist.id",
          "user.bio",
          "user.first_name",
          "user.last_name",
          "user.birth_date",
          "artist.nick_name",
          "artist.monthly_listeners",
          "cover_image.id",
          "cover_image.image_path",
          "profile_image.id",
          "profile_image.image_path",
          // "banner_image.id",
          // "banner_image.image_path",
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
        relations: {
          from_user: true,
          to_user: true
        },
        select: {
          id: true,
          to_user: {
            id: true
          },
          from_user: {
            id: true
          }
        }
      });

      let isFollow = false;
      if (checkFollow) {
        isFollow = true;
      }

      const simpleData = {
        user_id: getArtist.user.id,
        artist_id: getArtist.id,
        artist_username: getArtist.user.username,
        artist_birth_date: getArtist.user?.birth_date || null,
        artist_cover_image: getArtist.user.cover_image?.image_path || null,
        artist_profile_image: getArtist.user.profile_image?.image_path || null,
        // artist_banner_image: getArtist.user.profile.banner_image?.image_path || null,
        artist_first_name: getArtist.user.first_name || null,
        artist_last_name: getArtist.user.last_name || null,
        monthly_listeners: getArtist.monthly_listeners || 0,
        bio: getArtist.bio,
        nick_name: getArtist.nick_name,
        gallery_images: getArtist.gallery_images
        .filter(gallery => gallery.is_active)
        .map((gallery) => ({
          id: gallery.id,
          image_path: gallery.image?.image_path || null,
        })),
        artist_social: getArtist.social_links
        .filter(social => social.is_active)
        .map((social) => ({
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
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);
