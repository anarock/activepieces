import {
    FastifyPluginAsyncTypebox,
    Type,
} from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { platformMustBeOwnedByCurrentUser } from '../ee/authentication/ee-authorization'
import { platformService } from './platform.service'
import {
    ApId,
    assertEqual,
    Platform,
    PlatformWithoutSensitiveData,
    Principal,
    UpdatePlatformRequestBody,
} from '@activepieces/shared'

export const platformController: FastifyPluginAsyncTypebox = async (app) => {
    app.post('/:id', UpdatePlatformRequest, async (req, res) => {
        await platformMustBeOwnedByCurrentUser.call(app, req, res)
        return platformService.update({
            id: req.params.id,
            ...req.body,
        })
    })

    app.get('/:id', GetPlatformRequest, async (req) => {
        assertEqual(
            req.principal.platform.id,
            req.params.id,
            'userPlatformId',
            'paramId',
        )
        const platform = await platformService.getOneOrThrow(req.params.id)

        return buildResponse({
            platform,
            principal: req.principal,
        })
    })
}

const buildResponse = ({
    platform,
    principal,
}: BuildResponseParams): Platform | PlatformBasics => {
    if (platform.ownerId === principal.id) {
        return {
            ...platform,
            smtpPassword: undefined,
        }
    }

    const { id, name, defaultLocale, projectRolesEnabled } = platform
    return { id, name, defaultLocale, projectRolesEnabled }
}

type BuildResponseParams = {
    platform: Platform
    principal: Principal
}

type PlatformBasics = Pick<Platform, 'id' | 'name' | 'defaultLocale' | 'projectRolesEnabled'>

const UpdatePlatformRequest = {
    schema: {
        body: UpdatePlatformRequestBody,
        params: Type.Object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: PlatformWithoutSensitiveData,
        },
    },
}

const GetPlatformRequest = {
    schema: {
        params: Type.Object({
            id: ApId,
        }),
    },
}
