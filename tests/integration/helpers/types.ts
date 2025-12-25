import { RegisterOptions } from '@src/containerConfig';
import { InjectionObject } from '@src/common/dependencyRegistration';

export type GetBaseRegisterOptions = (injectionObjects?: InjectionObject<unknown>[]) => Required<RegisterOptions>;
