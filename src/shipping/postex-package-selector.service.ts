import { BadRequestException, Injectable } from '@nestjs/common';
import {
  POSTEX_PACKAGES,
  PostexPackageDefinition,
} from './constants/postex-packages';

export type CartPackageItem = {
  quantity: number;
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isFragile: boolean;
  isLiquid: boolean;
};

export type PackageSelectionInput = {
  items: CartPackageItem[];
  totalWeightGram: number;
  totalValueToman: number;
  isFragile: boolean;
  isLiquid: boolean;
  estimatedLengthCm: number;
  estimatedWidthCm: number;
  estimatedHeightCm: number;
};

export type SelectedPostexPackage = {
  boxTypeId: number;
  code: string;
  title: string;
  kind: string;

  packageLengthCm: number;
  packageWidthCm: number;
  packageHeightCm: number;

  shipmentLengthCm: number;
  shipmentWidthCm: number;
  shipmentHeightCm: number;
};

@Injectable()
export class PostexPackageSelectorService {
  getCandidatePackages(input: PackageSelectionInput): SelectedPostexPackage[] {
    const enabledPackages = POSTEX_PACKAGES.filter((item) => item.enabled);

    const normalPackages = enabledPackages.filter(
      (item) => item.kind !== 'oversize',
    );

    const oversizePackages = enabledPackages.filter(
      (item) => item.kind === 'oversize',
    );

    const normalCandidates = normalPackages
      .filter((item) => this.canUsePackage(item, input))
      .map((item) => this.toSelectedPackage(item, input))
      .sort((a, b) => {
        const aPriority = this.getKindPriority(a.kind);
        const bPriority = this.getKindPriority(b.kind);

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return this.getPackageVolume(a) - this.getPackageVolume(b);
      });

    if (normalCandidates.length > 0) {
      return normalCandidates;
    }

    const oversizeCandidates = oversizePackages
      .filter((item) => this.canUsePackage(item, input))
      .map((item) => this.toSelectedPackage(item, input));

    if (oversizeCandidates.length > 0) {
      return oversizeCandidates;
    }

    throw new BadRequestException(
      'برای کالاهای داخل سبد خرید، بسته مناسب پستکس پیدا نشد',
    );
  }

  selectBestPackage(input: PackageSelectionInput): SelectedPostexPackage {
    return this.getCandidatePackages(input)[0];
  }

  private canUsePackage(
    postexPackage: PostexPackageDefinition,
    input: PackageSelectionInput,
  ) {
    if (input.isFragile && !postexPackage.allowFragile) {
      return false;
    }

    if (input.isLiquid && !postexPackage.allowLiquid) {
      return false;
    }

    if (postexPackage.kind === 'envelope') {
      return this.canUseEnvelope(postexPackage, input);
    }

    if (postexPackage.kind === 'oversize') {
      return true;
    }

    return this.canFitInsideBox(postexPackage, input);
  }

  private canUseEnvelope(
    postexPackage: PostexPackageDefinition,
    input: PackageSelectionInput,
  ) {
    if (input.items.length !== 1) {
      return false;
    }

    const onlyItem = input.items[0];

    if (onlyItem.quantity !== 1) {
      return false;
    }

    if (onlyItem.isFragile || onlyItem.isLiquid) {
      return false;
    }

    if (input.isFragile || input.isLiquid) {
      return false;
    }

    if (input.totalWeightGram > 500) {
      return false;
    }

    if (input.estimatedHeightCm > 1) {
      return false;
    }

    const itemDims = this.sortDims([
      onlyItem.lengthCm,
      onlyItem.widthCm,
      onlyItem.heightCm,
    ]);

    const packageDims = this.sortDims([
      postexPackage.lengthCm,
      postexPackage.widthCm,
      postexPackage.heightCm,
    ]);

    return this.sortedDimsFit(itemDims, packageDims);
  }

  private canFitInsideBox(
    postexPackage: PostexPackageDefinition,
    input: PackageSelectionInput,
  ) {
    const boxDims = [
      postexPackage.lengthCm,
      postexPackage.widthCm,
      postexPackage.heightCm,
    ];

    for (const item of input.items) {
      const itemDims = [item.lengthCm, item.widthCm, item.heightCm];

      if (!this.canSingleItemFitInBox(itemDims, boxDims)) {
        return false;
      }
    }

    if (input.items.length === 1) {
      const onlyItem = input.items[0];

      if (
        this.canRepeatedSameItemFitInBox(
          [onlyItem.lengthCm, onlyItem.widthCm, onlyItem.heightCm],
          onlyItem.quantity,
          boxDims,
        )
      ) {
        return true;
      }
    }

    const estimatedDims = this.sortDims([
      input.estimatedLengthCm,
      input.estimatedWidthCm,
      input.estimatedHeightCm,
    ]);

    const packageDims = this.sortDims(boxDims);

    const estimatedFits = this.sortedDimsFit(estimatedDims, packageDims);

    if (!estimatedFits) {
      return false;
    }

    const estimatedVolume =
      input.estimatedLengthCm *
      input.estimatedWidthCm *
      input.estimatedHeightCm;

    const packageVolume =
      postexPackage.lengthCm *
      postexPackage.widthCm *
      postexPackage.heightCm;

    return estimatedVolume <= packageVolume;
  }

  private canSingleItemFitInBox(itemDims: number[], boxDims: number[]) {
    const itemOrientations = this.getOrientations(itemDims);

    return itemOrientations.some((item) => {
      return (
        item[0] <= boxDims[0] &&
        item[1] <= boxDims[1] &&
        item[2] <= boxDims[2]
      );
    });
  }

  private canRepeatedSameItemFitInBox(
    itemDims: number[],
    quantity: number,
    boxDims: number[],
  ) {
    if (quantity <= 1) {
      return this.canSingleItemFitInBox(itemDims, boxDims);
    }

    const itemOrientations = this.getOrientations(itemDims);

    return itemOrientations.some((item) => {
      const countLength = Math.floor(boxDims[0] / item[0]);
      const countWidth = Math.floor(boxDims[1] / item[1]);
      const countHeight = Math.floor(boxDims[2] / item[2]);

      const capacity = countLength * countWidth * countHeight;

      return capacity >= quantity;
    });
  }

  private toSelectedPackage(
    postexPackage: PostexPackageDefinition,
    input: PackageSelectionInput,
  ): SelectedPostexPackage {
    if (postexPackage.kind === 'oversize') {
      return {
        boxTypeId: postexPackage.boxTypeId,
        code: postexPackage.code,
        title: postexPackage.title,
        kind: postexPackage.kind,

        packageLengthCm: input.estimatedLengthCm,
        packageWidthCm: input.estimatedWidthCm,
        packageHeightCm: input.estimatedHeightCm,

        shipmentLengthCm: input.estimatedLengthCm,
        shipmentWidthCm: input.estimatedWidthCm,
        shipmentHeightCm: input.estimatedHeightCm,
      };
    }

    return {
      boxTypeId: postexPackage.boxTypeId,
      code: postexPackage.code,
      title: postexPackage.title,
      kind: postexPackage.kind,

      packageLengthCm: postexPackage.lengthCm,
      packageWidthCm: postexPackage.widthCm,
      packageHeightCm: postexPackage.heightCm,

      shipmentLengthCm: postexPackage.lengthCm,
      shipmentWidthCm: postexPackage.widthCm,
      shipmentHeightCm: postexPackage.heightCm,
    };
  }

  private getOrientations(dims: number[]) {
    const [a, b, c] = dims.map((item) => Math.ceil(item));

    const orientations = [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ];

    const unique = new Map<string, number[]>();

    for (const item of orientations) {
      unique.set(item.join('x'), item);
    }

    return Array.from(unique.values());
  }

  private sortDims(dims: number[]) {
    return dims.map((item) => Math.ceil(item)).sort((a, b) => a - b);
  }

  private sortedDimsFit(itemDims: number[], packageDims: number[]) {
    return (
      itemDims[0] <= packageDims[0] &&
      itemDims[1] <= packageDims[1] &&
      itemDims[2] <= packageDims[2]
    );
  }

  private getKindPriority(kind: string) {
    if (kind === 'envelope') {
      return 1;
    }

    if (kind === 'box') {
      return 2;
    }

    if (kind === 'oversize') {
      return 99;
    }

    return 100;
  }

  private getPackageVolume(item: SelectedPostexPackage) {
    return (
      item.packageLengthCm *
      item.packageWidthCm *
      item.packageHeightCm
    );
  }
}