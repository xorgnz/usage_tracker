/** Exact nonnegative decimal arithmetic for token counts and USD rate calculations. */
export class ExactDecimal
{
    static readonly maxDigits = 10000;
    static readonly maxScale = 1000;
    private readonly coefficient: bigint;
    private readonly scale: number;

    private constructor(coefficient: bigint, scale: number)
    {
        // Normalize before checking bounds; never round to fit the supported representation.
        while (scale > 0 && coefficient % 10n === 0n)
        {
            coefficient /= 10n;
            scale--;
        }
        if (scale > ExactDecimal.maxScale || coefficient.toString().length > ExactDecimal.maxDigits)
        {
            throw new RangeError('Exact decimal exceeds supported digits or scale; rounding is not permitted.');
        }
        this.coefficient = coefficient;
        this.scale = scale;
        Object.freeze(this);
    }

    static parse(value: string): ExactDecimal
    {
        // Decimal strings avoid precision loss from JavaScript number conversion.
        if (!/^\d+(\.\d+)?$/.test(value) || value.length > ExactDecimal.maxDigits + ExactDecimal.maxScale + 1)
        {
            throw new Error('Expected nonnegative decimal text without exponent notation.');
        }
        const [whole, fraction = ''] = value.split('.');
        return new ExactDecimal(BigInt(whole + fraction), fraction.length);
    }

    add(other: ExactDecimal): ExactDecimal
    {
        const scale = Math.max(this.scale, other.scale);
        const left = this.coefficient * 10n ** BigInt(scale - this.scale);
        const right = other.coefficient * 10n ** BigInt(scale - other.scale);
        return new ExactDecimal(left + right, scale);
    }

    multiply(other: ExactDecimal): ExactDecimal
    {
        return new ExactDecimal(this.coefficient * other.coefficient, this.scale + other.scale);
    }

    divideByInteger(divisor: bigint): ExactDecimal
    {
        if (divisor <= 0n || divisor.toString().length > ExactDecimal.maxDigits)
        {
            throw new RangeError('Rate-unit divisor must be positive and within supported precision.');
        }

        // Reduce first, then accept only terminating base-ten expansions.
        let left = this.coefficient;
        let right = divisor;
        while (right !== 0n)
        {
            [left, right] = [right, left % right];
        }
        let denominator = divisor / left;
        let coefficient = this.coefficient / left;
        let twos = 0;
        let fives = 0;
        while (denominator % 2n === 0n)
        {
            denominator /= 2n;
            twos++;
        }
        while (denominator % 5n === 0n)
        {
            denominator /= 5n;
            fives++;
        }
        if (denominator !== 1n)
        {
            throw new RangeError('Nonterminating decimal division is unsupported; no approximate rate is produced.');
        }
        const extraScale = Math.max(twos, fives);
        coefficient *= 2n ** BigInt(extraScale - twos) * 5n ** BigInt(extraScale - fives);
        return new ExactDecimal(coefficient, this.scale + extraScale);
    }

    isZero(): boolean
    {
        return this.coefficient === 0n;
    }

    toString(): string
    {
        const digits = this.coefficient.toString().padStart(this.scale + 1, '0');
        return this.scale === 0 ? digits : `${digits.slice(0, -this.scale)}.${digits.slice(-this.scale)}`;
    }
}
