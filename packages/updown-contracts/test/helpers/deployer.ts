import { Contract } from "ethers";
import { ethers, waffle } from "hardhat";


export async function deploy<T=Contract>(name:string, ...constructorArgs:any):Promise<T> {
    const factory = await ethers.getContractFactory(name)
    const instance = await factory.deploy(...constructorArgs)
    await instance.deployed()
    return (instance as any) as T
}